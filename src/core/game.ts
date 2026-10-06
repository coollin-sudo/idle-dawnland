import { Emitter } from './events';
import type { GameEvents } from './gameEvents';
import { Rng } from './rng';
import type { GameState } from './types';
import type { Unit } from './unit';
import { Battle } from '@/systems/combat';
import { createActivity, type Activity, type ActivityKind } from '@/systems/activities';
import { makePetUnit, refreshHeroUnit } from '@/systems/units';
import { checkProgress } from '@/systems/quests';
import { trackRates } from '@/systems/offline';
import { grantStarterKit } from '@/systems/progression';
import { setNumberStyle } from './format';
import { potionHeal, potionPrice } from './formulas';

export const STEP_MS = 100;

export interface GameOptions {
  headless?: boolean;
  now?: () => number;
}

/** 遊戲主控制器：持有狀態、亂數、事件與目前的活動（關卡/副本/高塔） */
export class Game {
  state: GameState;
  rng: Rng;
  ev = new Emitter<GameEvents>();
  battle!: Battle;
  activity!: Activity;
  headless: boolean;
  now: () => number;
  /** UI 用：每次狀態有實質變化就 +1 */
  version = 0;
  /** 升級後下一步回滿生命 */
  pendingFullHeal = false;
  private acc = 0;
  private slowAcc = 0;
  private dirtyHero = false;
  private dirtyPet = false;

  constructor(state: GameState, opts: GameOptions = {}) {
    this.state = state;
    this.headless = !!opts.headless;
    this.now = opts.now ?? (() => Date.now());
    this.rng = new Rng(state.seed ^ (Date.now() & 0xffff));
    this.ev.muted = this.headless;
    if (!this.headless) {
      setNumberStyle(state.settings.numberStyle);
      this.ev.on('unit:hit', e => {
        if (e.src?.side !== 'hero' || e.tgt.side === 'hero') return;
        if (e.crit && e.src.kind === 'hero') this.count('crits');
        this.countMax('maxHit', Math.round(e.amount));
      });
      this.ev.on('unit:act', e => { if (e.skill && e.src.kind === 'hero') this.count('skillsCast'); });
    }
    grantStarterKit(this);
    this.startActivity('stage');
  }

  // ---------------------------------------------------------------------
  // 計數器與通知
  // ---------------------------------------------------------------------
  count(key: string, n = 1) {
    this.state.counters[key] = (this.state.counters[key] ?? 0) + n;
  }
  countMax(key: string, v: number) {
    if ((this.state.counters[key] ?? 0) < v) this.state.counters[key] = v;
  }
  toast(text: string, kind: GameEvents['toast']['kind'] = 'info', icon?: string) {
    this.ev.emit('toast', { text, kind, icon });
  }
  log(text: string, kind?: string) {
    this.ev.emit('log', { text, kind });
  }
  touch() {
    this.version++;
  }
  nextUid = () => this.state.nextUid++;

  // ---------------------------------------------------------------------
  // 活動與戰鬥
  // ---------------------------------------------------------------------
  newBattle(): Battle {
    this.battle = new Battle(this.rng, this.ev, {
      onKill: (u, k) => this.activity.onKill(u, k),
      onHeroDeath: () => this.activity.onHeroDeath(),
      spawn: (id, s) => this.activity.spawn(id, s),
      extraInc: (src, tgt) => this.activity.extraInc?.(src, tgt) ?? 0,
    });
    return this.battle;
  }

  startActivity(kind: ActivityKind, arg?: string) {
    if (this.activity && this.battle?.hero) this.saveHeroVitals(this.battle.hero);
    this.activity = createActivity(this, kind, arg);
    this.activity.start();
    this.touch();
  }

  get heroUnit(): Unit | undefined {
    return this.battle?.hero;
  }

  /** 英雄數值改變（換裝、升級、天賦…）時呼叫，下一步更新戰鬥中的英雄 */
  heroChanged() {
    this.dirtyHero = true;
    this.touch();
  }

  petChanged() {
    this.dirtyPet = true;
  }

  saveHeroVitals(u: Unit) {
    this.state.hero.hp = u.alive ? u.hp : 0;
    this.state.hero.mp = u.mp;
  }

  // ---------------------------------------------------------------------
  // 主迴圈
  // ---------------------------------------------------------------------
  /** 推進遊戲時間（毫秒）。大量時間會被拆成固定步長 */
  advance(ms: number) {
    this.acc += ms;
    let steps = 0;
    while (this.acc >= STEP_MS) {
      this.acc -= STEP_MS;
      this.step(STEP_MS);
      if (++steps > 20000) { this.acc = 0; break; }
    }
  }

  step(dt: number) {
    const s = this.state;
    s.playMs += dt;
    if (this.dirtyHero && this.battle.hero) {
      refreshHeroUnit(s, this.battle.hero);
      this.dirtyHero = false;
    }
    if (this.dirtyPet && this.battle.hero) {
      this.dirtyPet = false;
      for (const u of this.battle.units) if (u.kind === 'pet') u.alive = false;
      this.battle.sweep();
      const pet = makePetUnit(s, this.battle.hero, this.battle.nextUid());
      if (pet) this.battle.add(pet);
    }
    if (this.pendingFullHeal && this.battle.hero?.alive) {
      const h = this.battle.hero;
      h.hp = h.stats.hp;
      h.mp = h.stats.mp;
      this.pendingFullHeal = false;
    }
    this.activity.tick(dt);
    const hero = this.battle.hero;
    if (hero) {
      this.saveHeroVitals(hero);
      this.autoPotion(hero);
    }
    trackRates(this, dt);
    this.slowAcc += dt;
    if (this.slowAcc >= 1000) {
      this.slowAcc = 0;
      checkProgress(this);
    }
  }

  /** 藥水用完時自動用金幣補 10 瓶（買得起的最好等級） */
  private autoBuyPotion(): number {
    const lv = this.state.hero.level;
    const want = lv < 20 ? 0 : lv < 50 ? 1 : 2;
    for (let t = want; t >= 0; t--) {
      const cost = potionPrice(t, lv) * 10;
      if (this.state.cur.gold >= cost * 2) {
        this.state.cur.gold -= cost;
        this.state.potions[t] += 10;
        this.log(`自動補充${['初級', '中級', '高級'][t]}藥水 ×10`, 'dim');
        return t;
      }
    }
    return -1;
  }

  private potionCd = 0;
  private autoPotion(hero: Unit) {
    this.potionCd = Math.max(0, this.potionCd - STEP_MS);
    if (!hero.alive || this.potionCd > 0) return;
    if (hero.hp / hero.stats.hp * 100 >= this.state.settings.potionAt) return;
    const pots = this.state.potions;
    const missing = 1 - hero.hp / hero.stats.hp;
    // 先用夠用的最小瓶，沒有就用最大瓶
    const heal = [potionHeal(0), potionHeal(1), potionHeal(2)];
    let tier = -1;
    for (let t = 0; t < 3; t++) if (pots[t] > 0 && heal[t] >= missing * 0.6) { tier = t; break; }
    if (tier < 0) for (let t = 2; t >= 0; t--) if (pots[t] > 0) { tier = t; break; }
    if (tier < 0 && this.state.settings.autoBuyPotions) tier = this.autoBuyPotion();
    if (tier < 0) return;
    pots[tier]--;
    this.potionCd = 3000;
    this.battle.heal(hero, hero.stats.hp * heal[tier], true);
    this.ev.emit('unit:buff', { tgt: hero, name: '藥水' });
    if (pots[tier] === 0) this.toast(['初級', '中級', '高級'][tier] + '藥水用完了', 'warn', '🧪');
  }
}
