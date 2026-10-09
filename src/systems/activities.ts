import type { Game } from '@/core/game';
import { mechOf } from '@/data/bossMechanics';
import { weekKey } from '@/online/week';
import { applyGearSwap } from './gearsets';
import { BOSS_TIME_MS, DIFFICULTIES, REGION_COUNT, STAGES_PER_REGION, WAVES_PER_STAGE, stageLevel } from '@/core/formulas';
import { todayKey } from '@/core/format';
import type { Unit } from '@/core/unit';
import { DUNGEON_DAILY, DUNGEON_MAP, TOWER_BOSSES, TOWER_TIME_MS, towerGems, towerHpMult, towerLevel, type DungeonDef } from '@/data/dungeons';
import { getMonster } from '@/data/monsters';
import { REGIONS, regionOfStage } from '@/data/regions';
import { codexInc } from './quests';
import { generateItem, pickSet, rollRarity } from './items';
import { itemCtx, receiveItem, rewardKill } from './loot';
import { makeHeroUnit, makeMonsterUnit, makePetUnit, rollElites } from './units';
import { combatPower, heroStats } from './hero';

export type ActivityKind = 'stage' | 'dungeon' | 'tower';
export type Phase = 'fight' | 'between' | 'dead' | 'done';

export interface Activity {
  kind: ActivityKind;
  phase: Phase;
  timeLeft: number;
  timeTotal: number;
  start(): void;
  tick(dt: number): void;
  onKill(u: Unit, killer: Unit | null): void;
  onHeroDeath(): void;
  spawn(monsterId: string, summoner: Unit): Unit | null;
  extraInc?(src: Unit, tgt: Unit): number;
  title(): string;
  subtitle(): string;
}

export function createActivity(g: Game, kind: ActivityKind, arg?: string): Activity {
  if (kind === 'dungeon') return new DungeonActivity(g, DUNGEON_MAP.get(arg ?? 'gold')!);
  if (kind === 'tower') return new TowerActivity(g);
  return new StageActivity(g);
}

const MAX_STAGE = REGION_COUNT * STAGES_PER_REGION - 1;

function setupHero(g: Game, fullHp: boolean) {
  const b = g.newBattle();
  if (fullHp) { g.state.hero.hp = 0; g.state.hero.mp = 0; }
  const hero = b.add(makeHeroUnit(g.state, b.nextUid()));
  const pet = makePetUnit(g.state, hero, b.nextUid());
  if (pet) b.add(pet);
  return hero;
}

function regenBetween(g: Game, dt: number) {
  const h = g.battle.hero;
  if (!h?.alive) return;
  h.hp = Math.min(h.stats.hp, h.hp + h.stats.hp * 0.1 * dt / 1000);
  h.mp = Math.min(h.stats.mp, h.mp + h.stats.mp * 0.08 * dt / 1000);
}

// =====================================================================
// 主線關卡
// =====================================================================
export class StageActivity implements Activity {
  kind = 'stage' as const;
  phase: Phase = 'fight';
  timeLeft = 0;
  timeTotal = 0;
  wave = 0;
  private timer = 0;
  private stageDone = false;
  private farmClears = 0;
  private deathStreak = 0;
  /** 上次失敗時的戰力與等級：變強之後才會自動再推進 */
  private failPower = 0;
  private failLevel = 0;

  constructor(private g: Game) {}

  get stage() { return this.g.state.progress.stage; }
  get diff() { return this.g.state.progress.difficulty; }
  isBossStage() { return this.stage % STAGES_PER_REGION === STAGES_PER_REGION - 1; }
  isBossWave() { return this.isBossStage() && this.wave === WAVES_PER_STAGE - 1; }

  title() {
    const r = regionOfStage(this.stage);
    return `${r.name} ${Math.floor(this.stage / 10) + 1}-${(this.stage % 10) + 1}`;
  }
  subtitle() {
    const d = DIFFICULTIES[this.diff];
    return `${d.name}・第 ${this.wave + 1}/${WAVES_PER_STAGE} 波${this.g.state.progress.mode === 'farm' ? '・刷怪中' : ''}`;
  }

  start() {
    setupHero(this.g, this.g.state.hero.hp <= 0);
    this.wave = 0;
    this.stageDone = false;
    this.g.ev.emit('stage:enter', { stage: this.stage, difficulty: this.diff });
    this.spawnWave();
  }

  private spawnWave() {
    const g = this.g;
    applyGearSwap(g);
    const b = g.battle;
    b.sweep();
    const region = regionOfStage(this.stage);
    const L = stageLevel(this.diff, this.stage);
    const diffMult = DIFFICULTIES[this.diff].mult;
    const inRegion = this.stage % STAGES_PER_REGION;
    const units: Unit[] = [];
    if (this.isBossWave()) {
      const boss = makeMonsterUnit(getMonster(region.boss), { level: L + 1, diffMult, boss: true, slot: 1 }, b.nextUid(), g.rng);
      units.push(boss);
      const minions = 1 + (inRegion > 0 ? 1 : 0);
      for (let i = 0; i < minions; i++) {
        units.push(makeMonsterUnit(getMonster(region.monsters[i % 2]), { level: L, diffMult, slot: i === 0 ? 0 : 2 }, b.nextUid(), g.rng));
      }
      this.timeLeft = this.timeTotal = BOSS_TIME_MS;
    } else {
      const count = Math.min(4, Math.max(1, 1 + Math.floor((inRegion + this.wave * 0.5) / 3) + g.rng.int(0, 1)));
      const eliteChance = this.stage >= 3 ? 0.025 + Math.floor(this.stage / 10) * 0.008 + this.diff * 0.03 : 0;
      for (let i = 0; i < count; i++) {
        const def = getMonster(g.rng.pick(region.monsters));
        const elite = g.rng.chance(eliteChance) ? rollElites(g.rng, L, L > 40 && g.rng.chance(0.3) ? 2 : 1) : [];
        units.push(makeMonsterUnit(def, { level: L, diffMult, elite, slot: i }, b.nextUid(), g.rng));
      }
      this.timeLeft = this.timeTotal = 0;
    }
    // 稀有事件：寶藏哥布林（12 秒內沒打倒就會逃走）
    if (!this.isBossWave() && this.stage >= 4 && units.length < 4 && g.rng.chance(0.02)) {
      const gob = makeMonsterUnit(getMonster('gold_goblin'), { level: L, diffMult, slot: units.length, hpMult: 2.5, atkMult: 0.3 }, b.nextUid(), g.rng);
      gob.expires = b.time + 12;
      gob.interval = 99;
      units.push(gob);
      g.toast('寶藏哥布林出現了！快打倒牠！', 'epic', '💰');
    }
    units.sort((a, b2) => a.slot - b2.slot);
    units.forEach((u, i) => { u.slot = i; b.add(u); });
    g.ev.emit('battle:start', { units, boss: this.isBossWave(), kind: 'stage' });
    this.phase = 'fight';
  }

  tick(dt: number) {
    const g = this.g;
    switch (this.phase) {
      case 'dead':
        this.timer -= dt;
        if (this.timer <= 0) {
          g.ev.emit('hero:revive', {});
          if (this.isBossStage() && this.wave === WAVES_PER_STAGE - 1) this.bossFail('death');
          else if (this.deathStreak >= 3 && g.state.progress.stage > 0) {
            // 連續倒下：退回前一關刷怪
            const p = g.state.progress;
            p.stage--;
            while (p.stage > 0 && stageLevel(this.diff, p.stage) > g.state.hero.level + 1) p.stage--;
            p.mode = 'farm';
            this.markFail();
            g.toast('敵人太強了，退回前一關修練', 'warn', '↩️');
            this.start();
          } else this.start();
        }
        return;
      case 'between':
        this.timer -= dt;
        regenBetween(g, dt);
        if (this.timer <= 0) {
          if (this.stageDone) this.nextStage();
          else this.spawnWave();
        }
        return;
      case 'fight':
        g.battle.tick(dt / 1000);
        if (this.phase !== 'fight') return;
        if (this.timeTotal > 0) {
          this.timeLeft -= dt;
          if (this.timeLeft <= 0) { this.bossFail('time'); return; }
        }
        if (!g.battle.aliveEnemies().length) this.waveCleared();
        return;
    }
  }

  private waveCleared() {
    const g = this.g;
    g.ev.emit('battle:clear', {});
    this.wave++;
    if (this.wave >= WAVES_PER_STAGE) {
      this.stageCleared();
      this.phase = 'between';
      this.timer = 900;
    } else {
      this.phase = 'between';
      this.timer = 700;
    }
  }

  private stageCleared() {
    const g = this.g;
    const p = g.state.progress;
    const first = this.stage > p.best[this.diff];
    if (first) {
      p.best[this.diff] = this.stage;
      const eff = this.diff * 80 + this.stage;
      if (eff > g.state.rebirth.bestStageEver) g.state.rebirth.bestStageEver = eff;
      if (eff > g.state.records.bestEff) g.state.records.bestEff = eff;
      const gems = this.isBossStage() ? 20 + Math.floor(this.stage / 10) * 10 + this.diff * 30 : 2 + this.diff * 2;
      g.state.cur.gems += gems;
      g.ev.emit('loot:currency', { key: 'gems', amount: gems });
      if (this.isBossStage()) {
        const region = REGIONS[Math.floor(this.stage / 10)];
        g.toast(`收復碎片！${region.name} 制霸`, 'legend', '💎');
      }
      if (this.stage === MAX_STAGE && this.diff < DIFFICULTIES.length - 1 && p.unlockedDifficulty <= this.diff) {
        p.unlockedDifficulty = this.diff + 1;
        g.toast(`解鎖「${DIFFICULTIES[this.diff + 1].name}」難度！`, 'legend', '🔥');
      }
    }
    g.count('stagesCleared');
    g.ev.emit('stage:clear', { stage: this.stage, first });
    this.stageDone = true;
  }

  private nextStage() {
    const g = this.g;
    const p = g.state.progress;
    if (p.mode === 'farm') {
      this.farmClears++;
      if (g.state.settings.autoBoss && p.stage < MAX_STAGE && p.stage <= p.best[this.diff] && this.readyToPush()) {
        p.mode = 'push';
        this.farmClears = 0;
      }
    }
    if (p.mode === 'push' && p.stage < MAX_STAGE) {
      if (g.state.settings.autoBoss && p.stage >= p.best[this.diff] && stageLevel(this.diff, p.stage + 1) > g.state.hero.level + StageActivity.PUSH_LEVEL_LEAD + 2) {
        // 等級落後太多：先停在這裡刷怪
        p.mode = 'farm';
        g.toast('等級不足，先在這裡修練', 'info', '🔁');
      } else p.stage++;
    }
    this.deathStreak = 0;
    this.wave = 0;
    this.stageDone = false;
    g.ev.emit('stage:enter', { stage: this.stage, difficulty: this.diff });
    this.spawnWave();
  }

  /** 自動推進不會推到怪物比英雄高超過這麼多級的關卡 */
  static readonly PUSH_LEVEL_LEAD = 3;

  private readyToPush() {
    if (this.farmClears < 2) return false;
    const s = this.g.state;
    if (stageLevel(this.diff, s.progress.stage + 1) > s.hero.level + StageActivity.PUSH_LEVEL_LEAD) return false;
    if (!this.failPower || this.farmClears >= 60) return true;
    return s.hero.level > this.failLevel || combatPower(s, heroStats(s)) >= this.failPower * 1.04;
  }

  private markFail() {
    const s = this.g.state;
    this.failPower = combatPower(s, heroStats(s));
    this.failLevel = s.hero.level;
    this.farmClears = 0;
    this.deathStreak = 0;
  }

  private bossFail(reason: 'time' | 'death') {
    const g = this.g;
    const p = g.state.progress;
    g.ev.emit('boss:fail', { reason });
    g.toast(reason === 'time' ? '時間到！首領撤退了，先回前一關變強吧' : '被首領擊敗了，先回前一關變強吧', 'bad', '⏱️');
    const mech = mechOf(getMonster(regionOfStage(this.stage).boss).mech);
    if (mech) g.toast(`「${mech.name}」${mech.hint}（地圖或技能頁可看首領情報）`, 'info', '💡');
    p.stage = Math.max(0, p.stage - 1);
    p.mode = 'farm';
    this.markFail();
    this.start();
  }

  onKill(u: Unit, killer: Unit | null) {
    if (u.defId === 'gold_goblin') {
      rewardKill(this.g, u, killer, { gold: 30, drop: 2, stones: 5 });
      receiveItem(this.g, generateItem(itemCtx(this.g), { ilvl: u.level + 2, rarity: rollRarity(this.g.rng, 'elite', 100, this.diff) }));
      this.g.count('goblins');
      this.g.toast('打倒寶藏哥布林！', 'legend', '💰');
      return;
    }
    if (u.boss && this.timeTotal > 0) this.recordBossTime(u);
    // 已經打倒過的首領再刷：獎勵降為精英等級，避免反覆刷首領造成傳說氾濫
    const repeat = u.boss && this.g.state.progress.best[this.diff] >= this.stage;
    rewardKill(this.g, u, killer, repeat ? { repeatBoss: true } : {});
  }

  /** 首領速通紀錄：英雄等級不高於首領時才算（避免高等級回頭秒殺） */
  private recordBossTime(u: Unit) {
    const g = this.g;
    if (g.state.hero.level > u.level) return;
    const ms = Math.round(this.timeTotal - this.timeLeft);
    const key = `${this.diff}:${u.defId}`;
    const rec = g.state.records.boss;
    if (rec[key] !== undefined && rec[key] <= ms) return;
    const first = rec[key] === undefined;
    rec[key] = ms;
    g.state.records.bossLv[key] = g.state.hero.level;
    if (!first) g.toast(`首領速通新紀錄：${u.name} ${(ms / 1000).toFixed(1)} 秒`, 'epic', '⏱️');
    g.ev.emit('record:boss', { key, ms });
  }

  onHeroDeath() {
    this.deathStreak++;
    this.g.count('deaths');
    this.g.ev.emit('hero:death', {});
    this.phase = 'dead';
    this.timer = 3500;
  }

  spawn(monsterId: string, summoner: Unit): Unit | null {
    const g = this.g;
    if (g.battle.aliveEnemies().length >= 5) return null;
    const used = new Set(g.battle.aliveEnemies().map(e => e.slot));
    let slot = 0;
    while (used.has(slot)) slot++;
    const u = makeMonsterUnit(getMonster(monsterId), { level: summoner.level - 1, diffMult: DIFFICULTIES[this.diff].mult, slot }, g.battle.nextUid(), g.rng);
    return g.battle.add(u);
  }

  extraInc(src: Unit, tgt: Unit) {
    return codexInc(this.g, src, tgt);
  }
}

/** 移動到指定關卡 */
export function travel(g: Game, stage: number, difficulty: number) {
  const p = g.state.progress;
  if (difficulty > p.unlockedDifficulty) return g.toast('尚未解鎖此難度', 'warn');
  if (stage > p.best[difficulty] + 1) return g.toast('需要先通關前一關', 'warn');
  p.stage = Math.max(0, Math.min(MAX_STAGE, stage));
  p.difficulty = difficulty;
  p.mode = stage <= p.best[difficulty] ? 'farm' : 'push';
  g.startActivity('stage');
}

export function setMode(g: Game, mode: 'push' | 'farm') {
  g.state.progress.mode = mode;
  g.touch();
}

// =====================================================================
// 每日副本
// =====================================================================
export function dungeonEntries(g: Game, id: string) {
  const d = g.state.dungeons;
  const today = todayKey(g.now());
  if (d.date !== today) { d.date = today; d.used = {}; d.bought = {}; }
  return DUNGEON_DAILY + (d.bought[id] ?? 0) - (d.used[id] ?? 0);
}

export function dungeonLevel(g: Game) {
  const best = Math.max(0, g.state.progress.best[0]);
  return Math.max(3, Math.min(g.state.hero.level, stageLevel(0, best) + 3));
}

export function startDungeon(g: Game, id: string) {
  if (!DUNGEON_MAP.has(id)) return;
  if (dungeonEntries(g, id) <= 0) return g.toast('今天的次數用完了', 'warn');
  g.startActivity('dungeon', id);
}

export function startTower(g: Game) {
  g.startActivity('tower');
}

export class DungeonActivity implements Activity {
  kind = 'dungeon' as const;
  phase: Phase = 'fight';
  timeLeft = 0;
  timeTotal = 0;
  kills = 0;
  private level = 1;
  private pending: number[] = [];
  private timer = 0;
  private earned = { gold: 0, xp: 0, stones: 0 };

  constructor(private g: Game, public def: DungeonDef) {}

  title() { return this.def.name; }
  subtitle() { return this.phase === 'done' ? `結束！擊殺 ${this.kills}` : `Lv.${this.level}・擊殺 ${this.kills}・剩餘 ${Math.ceil(Math.max(0, this.timeLeft) / 1000)} 秒`; }

  start() {
    const g = this.g;
    g.state.dungeons.used[this.def.id] = (g.state.dungeons.used[this.def.id] ?? 0) + 1;
    this.level = dungeonLevel(g);
    applyGearSwap(g);
    setupHero(g, true);
    this.timeLeft = this.timeTotal = this.def.durationMs;
    for (let i = 0; i < 3; i++) this.spawnOne();
    g.ev.emit('battle:start', { units: g.battle.aliveEnemies(), boss: false, kind: 'dungeon' });
    this.phase = 'fight';
  }

  private spawnOne() {
    const g = this.g;
    const used = new Set(g.battle.aliveEnemies().map(e => e.slot));
    let slot = 0;
    while (used.has(slot)) slot++;
    const def = getMonster(g.rng.pick(this.def.monsters));
    // 擊殺越多越強
    const ramp = 1 + this.kills * 0.03;
    g.battle.add(makeMonsterUnit(def, { level: this.level, diffMult: 1, slot, hpMult: ramp, atkMult: Math.sqrt(ramp) }, g.battle.nextUid(), g.rng));
  }

  tick(dt: number) {
    const g = this.g;
    if (this.phase === 'done') {
      this.timer -= dt;
      regenBetween(g, dt);
      if (this.timer <= 0) g.startActivity('stage');
      return;
    }
    g.battle.tick(dt / 1000);
    this.timeLeft -= dt;
    for (let i = this.pending.length - 1; i >= 0; i--) {
      this.pending[i] -= dt;
      if (this.pending[i] <= 0) { this.pending.splice(i, 1); this.spawnOne(); }
    }
    if (this.timeLeft <= 0) this.finish();
  }

  private finish() {
    const g = this.g;
    if (this.phase === 'done') return;
    this.phase = 'done';
    this.timer = 2500;
    g.count('dungeonRuns');
    const best = g.state.dungeons.best;
    if ((best[this.def.id] ?? 0) < this.kills) best[this.def.id] = this.kills;
    const parts = [];
    if (this.earned.gold) parts.push(`金幣 ${Math.round(this.earned.gold).toLocaleString()}`);
    if (this.earned.xp) parts.push(`經驗 ${Math.round(this.earned.xp).toLocaleString()}`);
    if (this.earned.stones) parts.push(`強化石 ${this.earned.stones}`);
    g.toast(`${this.def.name}結束：擊殺 ${this.kills}${parts.length ? '，' + parts.join('、') : ''}`, 'epic', this.def.icon);
    g.battle.units.filter(u => u.side === 'enemy').forEach(u => { u.alive = false; });
  }

  onKill(u: Unit, killer: Unit | null) {
    const g = this.g;
    const before = { gold: g.state.cur.gold, xp: g.state.counters.xpEarned ?? 0, stones: g.state.cur.stones };
    rewardKill(g, u, killer, this.def.mods);
    if (this.def.extra === 'stones' && g.rng.chance(0.5)) g.state.cur.essence += 1 + Math.floor(this.level / 15);
    this.earned.gold += g.state.cur.gold - before.gold;
    this.earned.stones += g.state.cur.stones - before.stones;
    this.earned.xp += (g.state.counters.xpEarned ?? 0) - before.xp;
    this.kills++;
    if (this.phase === 'fight') this.pending.push(350);
  }

  onHeroDeath() {
    this.g.ev.emit('hero:death', {});
    this.finish();
  }

  spawn(): Unit | null { return null; }
  extraInc(src: Unit, tgt: Unit) { return codexInc(this.g, src, tgt); }
}

// =====================================================================
// 無盡之塔
// =====================================================================
export class TowerActivity implements Activity {
  kind = 'tower' as const;
  phase: Phase = 'fight';
  timeLeft = 0;
  timeTotal = 0;
  private timer = 0;
  private result: 'win' | 'lose' | null = null;

  constructor(private g: Game) {}

  get floor() { return this.g.state.tower.floor; }
  title() { return `無盡之塔 第 ${this.floor} 層`; }
  subtitle() { return `最高紀錄 ${this.g.state.tower.best} 層`; }

  start() {
    const g = this.g;
    g.count('towerTries');
    applyGearSwap(g);
    setupHero(g, true);
    const f = this.floor;
    const bossId = TOWER_BOSSES[(f - 1) % TOWER_BOSSES.length];
    const L = towerLevel(f);
    const boss = makeMonsterUnit(getMonster(bossId), { level: L, diffMult: 1, boss: true, slot: 0, hpMult: towerHpMult(f) }, g.battle.nextUid(), g.rng);
    boss.name = `第 ${f} 層守衛・${boss.name}`;
    g.battle.add(boss);
    this.timeLeft = this.timeTotal = TOWER_TIME_MS;
    this.phase = 'fight';
    this.result = null;
    g.ev.emit('battle:start', { units: [boss], boss: true, kind: 'tower' });
  }

  tick(dt: number) {
    const g = this.g;
    if (this.phase === 'between' || this.phase === 'done') {
      this.timer -= dt;
      regenBetween(g, dt);
      if (this.timer <= 0) {
        if (this.result === 'win') this.start();
        else g.startActivity('stage');
      }
      return;
    }
    if (this.phase === 'dead') return;
    g.battle.tick(dt / 1000);
    if (this.phase !== 'fight') return;
    this.timeLeft -= dt;
    if (this.timeLeft <= 0) this.lose('time');
  }

  private lose(reason: 'time' | 'death') {
    const g = this.g;
    this.result = 'lose';
    this.phase = 'done';
    this.timer = 2500;
    g.toast(reason === 'time' ? `第 ${this.floor} 層挑戰失敗（時間到）` : `第 ${this.floor} 層挑戰失敗`, 'bad', '🗼');
    g.ev.emit('boss:fail', { reason });
  }

  onKill(u: Unit, killer: Unit | null) {
    const g = this.g;
    rewardKill(g, u, killer, { noItems: true, xp: 0.4, gold: 0.4 });
    const f = this.floor;
    const gems = towerGems(f);
    g.state.cur.gems += gems;
    g.ev.emit('loot:currency', { key: 'gems', amount: gems });
    if (f % 10 === 0) {
      const rarity = rollRarity(g.rng, 'chest', 50, Math.min(2, Math.floor(f / 40)), f / 10);
      const setId = g.rng.chance(0.35) ? pickSet(g.rng, g.state.hero.classId).id : undefined;
      receiveItem(g, generateItem(itemCtx(g), { ilvl: towerLevel(f), rarity, setId }));
      g.state.cur.protect += 1;
      g.toast(`第 ${f} 層寶箱！`, 'epic', '🎁');
    }
    g.state.tower.floor++;
    if (g.state.tower.best < f) g.state.tower.best = f;
    const wk = weekKey(g.now());
    if (g.state.tower.week !== wk) { g.state.tower.week = wk; g.state.tower.weekBest = 0; }
    if (g.state.tower.weekBest < f) g.state.tower.weekBest = f;
    g.countMax('towerBest', f);
    g.toast(`通過第 ${f} 層！寶石 +${gems}`, 'good', '🗼');
    this.result = 'win';
    this.phase = 'between';
    this.timer = 1500;
  }

  onHeroDeath() {
    this.g.ev.emit('hero:death', {});
    this.lose('death');
  }

  spawn(monsterId: string, summoner: Unit): Unit | null {
    const g = this.g;
    if (g.battle.aliveEnemies().length >= 4) return null;
    const used = new Set(g.battle.aliveEnemies().map(e => e.slot));
    let slot = 0;
    while (used.has(slot)) slot++;
    return g.battle.add(makeMonsterUnit(getMonster(monsterId), { level: summoner.level - 2, diffMult: 1, slot }, g.battle.nextUid(), g.rng));
  }

  extraInc(src: Unit, tgt: Unit) { return codexInc(this.g, src, tgt); }
}
