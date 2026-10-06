import type { Emitter } from '@/core/events';
import { armorDR, evadeChance } from '@/core/formulas';
import type { GameEvents } from '@/core/gameEvents';
import type { Rng } from '@/core/rng';
import type { Element, StatKey } from '@/core/stats';
import { scale, type DmgType, type FxKey, type SkillDef, type SkillEffect, type StatusApply, type TargetMode } from '@/core/types';
import { hasStatus, hpPct, isDisabled, recalc, resistOf, statusStacks, type StatusInst, type Unit } from '@/core/unit';
import { ELEMENT_STATUS, ELEMENT_STATUS_CHANCE, STATUSES } from '@/data/statuses';

export interface BattleHooks {
  onKill(unit: Unit, killer: Unit | null): void;
  onHeroDeath(): void;
  /** 首領召喚手下 */
  spawn(monsterId: string, summoner: Unit): Unit | null;
  /** 額外的傷害加成（%）：圖鑑、對特定種族等 */
  extraInc?(src: Unit, tgt: Unit): number;
}

interface HitOpts {
  mult: number;
  dmgType: DmgType;
  element: Element;
  skill?: boolean;
  status?: StatusApply[];
  pierce?: number;
  bonusCrit?: number;
  proc?: boolean;
  /** 以較高的攻擊力計算（觸發特效用） */
  bestBase?: boolean;
}

const ELEMENT_DMG: Partial<Record<Element, StatKey>> = {
  fire: 'fireDmg', ice: 'iceDmg', lightning: 'lightningDmg', holy: 'holyDmg', shadow: 'shadowDmg',
};

/** 每差一級的傷害修正 */
export const LEVEL_GAP = 0.04;
/** 等級差在這個範圍內不懲罰 */
export const LEVEL_GRACE = 2;

export class Battle {
  units: Unit[] = [];
  time = 0;
  private uidSeq = 1_000_000;

  constructor(
    public rng: Rng,
    public ev: Emitter<GameEvents>,
    public hooks: BattleHooks,
  ) {}

  nextUid() { return this.uidSeq++; }

  get hero(): Unit | undefined { return this.units.find(u => u.kind === 'hero'); }

  enemiesOf(u: Unit): Unit[] {
    return this.units.filter(o => o.alive && o.targetable && o.side !== u.side).sort((a, b) => a.slot - b.slot);
  }

  aliveEnemies(): Unit[] {
    return this.units.filter(u => u.alive && u.side === 'enemy');
  }

  add(u: Unit): Unit {
    this.units.push(u);
    this.ev.emit('unit:spawn', { unit: u });
    return u;
  }

  /** 移除已死亡的單位與到期的召喚物 */
  sweep(): void {
    this.units = this.units.filter(u => u.alive || u.kind === 'hero');
  }

  // =====================================================================
  // 主迴圈
  // =====================================================================
  tick(dt: number): void {
    this.time += dt;
    const list = this.units.slice();
    for (const u of list) {
      if (!u.alive) continue;
      if (u.expires !== undefined && this.time >= u.expires) {
        u.alive = false;
        this.ev.emit('unit:death', { unit: u, killer: null });
        continue;
      }
      this.tickStatuses(u, dt);
      if (!u.alive) continue;
      this.tickBuffs(u, dt);

      if (u.kind === 'hero' || u.kind === 'monster') {
        if (u.hp < u.stats.hp) u.hp = Math.min(u.stats.hp, u.hp + u.stats.hpRegen * dt);
        if (u.mp < u.stats.mp) u.mp = Math.min(u.stats.mp, u.mp + u.stats.mpRegen * dt);
      }
      if (u.shield > 0) {
        u.shieldTime -= dt;
        if (u.shieldTime <= 0) u.shield = 0;
      }
      const cdRate = 1 + u.stats.cdr / 100;
      for (const k in u.cds) if (u.cds[k] > 0) u.cds[k] = Math.max(0, u.cds[k] - dt * cdRate);

      if (u.powers.starfall) this.tickStarfall(u, dt);

      if (isDisabled(u)) {
        if (u.casting) this.interrupt(u);
        continue;
      }
      if (u.casting) {
        u.casting.remaining -= dt;
        if (u.casting.remaining <= 0) {
          const { skill, rank } = u.casting;
          u.casting = null;
          this.executeSkill(u, skill, rank, false);
        }
        continue;
      }
      u.actTimer += dt * Math.max(0.3, 1 + u.stats.haste / 100);
      if (u.actTimer >= u.interval) {
        u.actTimer -= u.interval;
        this.act(u);
      }
    }
  }

  private interrupt(u: Unit) {
    u.casting = null;
    this.ev.emit('unit:interrupt', { src: u });
  }

  private tickBuffs(u: Unit, dt: number) {
    if (!u.buffs.length) return;
    let changed = false;
    for (const b of u.buffs) b.remaining -= dt;
    const before = u.buffs.length;
    u.buffs = u.buffs.filter(b => b.remaining > 0);
    if (u.buffs.length !== before) changed = true;
    if (changed) recalc(u);
  }

  private tickStatuses(u: Unit, dt: number) {
    if (!u.statuses.length) return;
    let modsChanged = false;
    for (const s of u.statuses) {
      s.remaining -= dt;
      const def = STATUSES[s.id];
      if (def.dot) {
        s.tickAcc += dt;
        while (s.tickAcc >= 1 && u.alive) {
          s.tickAcc -= 1;
          this.dotTick(u, s);
        }
      }
    }
    if (!u.alive) return;
    const keep: StatusInst[] = [];
    for (const s of u.statuses) {
      if (s.remaining > 0) keep.push(s);
      else if (STATUSES[s.id].mods) modsChanged = true;
    }
    u.statuses = keep;
    if (modsChanged) recalc(u);
  }

  private dotTick(u: Unit, s: StatusInst) {
    const def = STATUSES[s.id];
    const src = this.units.find(x => x.uid === s.srcUid) ?? null;
    let dmg = s.dps * s.stacks;
    dmg *= 1 - resistOf(u, def.dot!.element) / 100;
    dmg *= Math.max(0.1, 1 + u.stats.dmgTaken / 100);
    if (src && src.powers.burnAmp && hasStatus(u, 'burn')) dmg *= 1 + src.powers.burnAmp / 100;
    this.applyDamage(u, Math.max(1, dmg), src, def.dot!.element, false, true, false);
  }

  private tickStarfall(u: Unit, dt: number) {
    u.mem.starfall = (u.mem.starfall ?? 0) + dt;
    if (u.mem.starfall < 8) return;
    u.mem.starfall = 0;
    const foes = this.enemiesOf(u);
    if (!foes.length) return;
    const t = this.rng.pick(foes);
    this.ev.emit('unit:proc', { src: u, name: '星墜', fx: 'meteor', targets: [t], element: 'holy' });
    this.hit(u, t, { mult: u.powers.starfall / 100, dmgType: 'magic', element: 'holy', proc: true, bestBase: true });
  }

  // =====================================================================
  // 行動
  // =====================================================================
  private act(u: Unit) {
    const foes = this.enemiesOf(u);
    if (!foes.length) return;
    for (const slot of u.skills) {
      if (slot.rank <= 0) continue;
      const def = slot.def;
      if ((u.cds[def.id] ?? 0) > 0) continue;
      const cost = scale(def.mp, slot.rank);
      if (u.mp < cost) continue;
      if (!this.condOk(u, def, foes)) continue;
      u.mp -= cost;
      u.cds[def.id] = def.cd;
      if (def.cond === 'once') u.mem['once:' + def.id] = 1;
      if (def.cast) {
        u.casting = { skill: def, rank: slot.rank, remaining: def.cast, total: def.cast };
        this.ev.emit('unit:cast', { src: u, skill: def, time: def.cast });
      } else {
        this.executeSkill(u, def, slot.rank, false);
      }
      return;
    }
    this.basicAttack(u, foes);
  }

  private condOk(u: Unit, def: SkillDef, foes: Unit[]): boolean {
    switch (def.cond) {
      case undefined: return true;
      case 'hpBelow70': return hpPct(u) < 0.7;
      case 'hpBelow50': return hpPct(u) < 0.5;
      case 'hpBelow30': return hpPct(u) < 0.3;
      case 'enemies2': return foes.length >= 2 || foes.some(f => f.boss);
      case 'enemies3': return foes.length >= 3;
      case 'boss': return foes.some(f => f.boss);
      case 'once': return !u.mem['once:' + def.id];
      case 'buffMissing': {
        const ids = def.effects.filter(e => e.type === 'buff').map(e => (e as { id: string }).id);
        return !u.buffs.some(b => ids.includes(b.id));
      }
    }
  }

  private countAttack(u: Unit) {
    u.mem.attacks = (u.mem.attacks ?? 0) + 1;
    if (u.powers.holyNova && u.mem.attacks % 5 === 0) {
      const foes = this.enemiesOf(u);
      if (foes.length) {
        this.ev.emit('unit:proc', { src: u, name: '聖光新星', fx: 'nova', targets: foes, element: 'holy' });
        for (const f of foes) this.hit(u, f, { mult: u.powers.holyNova / 100, dmgType: 'magic', element: 'holy', proc: true, bestBase: true });
      }
    }
  }

  private basicAttack(u: Unit, foes: Unit[]) {
    const tgt = foes[0];
    const targets = [tgt];
    if (u.powers.multishot && foes.length > 1) {
      const others = this.rng.shuffle(foes.slice(1)).slice(0, u.powers.multishot);
      targets.push(...others);
    }
    this.ev.emit('unit:act', { src: u, targets, fx: u.basic.fx, element: u.basic.element });
    for (const t of targets) {
      if (!t.alive) continue;
      this.hit(u, t, { mult: u.basic.mult, dmgType: u.basic.dmgType, element: u.basic.element });
    }
    if (u.kind === 'pet' && u.ownerUid !== undefined) {
      const owner = this.units.find(x => x.uid === u.ownerUid);
      if (owner?.alive && owner.powers.petBond) this.heal(owner, owner.stats.hp * 0.01, false);
    }
    this.countAttack(u);
  }

  private resolveTargets(u: Unit, mode: TargetMode): Unit[] {
    const foes = this.enemiesOf(u);
    if (!foes.length) return [];
    switch (mode) {
      case 'front': return [foes[0]];
      case 'all': return foes;
      case 'random': return [this.rng.pick(foes)];
      case 'lowest': return [foes.reduce((a, b) => (hpPct(b) < hpPct(a) ? b : a))];
      case 'highest': return [foes.reduce((a, b) => (b.hp > a.hp ? b : a))];
      case 'self': return [u];
    }
  }

  executeSkill(u: Unit, def: SkillDef, rank: number, isEcho: boolean): void {
    for (const eff of def.effects) {
      if (!u.alive) return;
      this.runEffect(u, def, rank, eff);
    }
    this.countAttack(u);
    if (!isEcho && u.powers.echo && def.classId !== 'enemy' && this.rng.chance(u.powers.echo / 100)) {
      this.ev.emit('unit:proc', { src: u, name: '回音', fx: def.fx, targets: [], element: 'phys' });
      this.executeSkill(u, def, rank, true);
    }
  }

  private runEffect(u: Unit, def: SkillDef, rank: number, eff: SkillEffect) {
    switch (eff.type) {
      case 'damage': {
        const mult = scale(eff.mult, rank);
        if (eff.target === 'random') {
          const all = this.enemiesOf(u);
          if (!all.length) return;
          this.ev.emit('unit:act', { src: u, targets: all, fx: def.fx, skill: def, element: eff.element });
          for (let h = 0; h < eff.hits; h++) {
            const foes = this.enemiesOf(u);
            if (!foes.length) break;
            this.hit(u, this.rng.pick(foes), { mult, dmgType: eff.dmgType, element: eff.element, skill: true, status: eff.status, pierce: eff.pierce, bonusCrit: eff.bonusCrit });
          }
        } else {
          const targets = this.resolveTargets(u, eff.target);
          if (!targets.length) return;
          this.ev.emit('unit:act', { src: u, targets, fx: def.fx, skill: def, element: eff.element });
          for (let h = 0; h < eff.hits; h++) {
            for (const t of targets) {
              if (!t.alive) continue;
              this.hit(u, t, { mult, dmgType: eff.dmgType, element: eff.element, skill: true, status: eff.status, pierce: eff.pierce, bonusCrit: eff.bonusCrit });
            }
          }
        }
        break;
      }
      case 'heal': {
        this.ev.emit('unit:act', { src: u, targets: [u], fx: def.fx, skill: def, element: 'holy' });
        this.heal(u, u.stats.hp * scale(eff.pct, rank) * (1 + u.stats.healPower / 100), true);
        break;
      }
      case 'shield': {
        const amt = u.stats.hp * scale(eff.pct, rank) * (1 + u.stats.shieldPower / 100);
        this.ev.emit('unit:act', { src: u, targets: [u], fx: def.fx, skill: def, element: 'holy' });
        this.addShield(u, amt, eff.dur);
        break;
      }
      case 'buff': {
        const existing = u.buffs.find(b => b.id === eff.id);
        if (existing) existing.remaining = eff.dur;
        else u.buffs.push({ id: eff.id, name: eff.name, remaining: eff.dur, mods: eff.mods(rank) });
        recalc(u);
        this.ev.emit('unit:act', { src: u, targets: [u], fx: def.fx, skill: def, element: 'phys' });
        this.ev.emit('unit:buff', { tgt: u, name: eff.name });
        break;
      }
      case 'debuff': {
        const targets = this.resolveTargets(u, eff.target);
        this.ev.emit('unit:act', { src: u, targets, fx: def.fx, skill: def, element: 'shadow' });
        for (const t of targets) if (this.rng.chance(eff.status.chance)) this.applyStatus(t, eff.status, u, 0);
        break;
      }
      case 'summon': {
        const power = Math.max(u.stats.atk, u.stats.matk) * scale(eff.mult, rank);
        const s: Unit = {
          uid: this.nextUid(), side: u.side, kind: 'summon', name: eff.name, defId: eff.id, level: u.level, boss: false, elite: [], slot: 1,
          statBase: { atk: power, matk: power, crit: u.stats.crit, critDmg: u.stats.critDmg, hp: 1 },
          baseMods: [], conversions: [], stats: u.stats, hp: 1, mp: 0, shield: 0, shieldTime: 0, alive: true, targetable: false,
          interval: eff.interval, actTimer: 0, basic: { dmgType: eff.dmgType, element: eff.element, fx: 'claw', ranged: false, mult: 1 },
          skills: [], cds: {}, casting: null, statuses: [], buffs: [], resist: {}, powers: {}, mem: {}, expires: this.time + eff.dur,
          ownerUid: u.uid, size: 0.8, ranged: false, look: { archetype: eff.archetype },
        };
        recalc(s);
        this.ev.emit('unit:act', { src: u, targets: [], fx: def.fx, skill: def, element: eff.element });
        this.add(s);
        break;
      }
      case 'spawn': {
        this.ev.emit('unit:act', { src: u, targets: [], fx: def.fx, skill: def, element: 'phys' });
        for (let i = 0; i < eff.count; i++) this.hooks.spawn(eff.monster, u);
        break;
      }
    }
  }

  // =====================================================================
  // 傷害計算
  // =====================================================================
  hit(src: Unit, tgt: Unit, o: HitOpts): number {
    if (!tgt.alive) return 0;
    const S = src.stats;

    // 迴避：只有物理攻擊會被迴避
    if (o.dmgType === 'phys' && !o.proc && this.rng.chance(evadeChance(tgt.stats.eva, src.level))) {
      this.ev.emit('unit:miss', { src, tgt });
      if (tgt.powers.evadeCrit) tgt.mem.evadeCrit = 1;
      if (tgt.powers.swift) {
        const b = tgt.buffs.find(x => x.id === 'swift');
        if (b) b.remaining = 3;
        else { tgt.buffs.push({ id: 'swift', name: '疾風', remaining: 3, mods: [{ stat: 'haste', kind: 'flat', value: tgt.powers.swift }] }); recalc(tgt); }
      }
      return 0;
    }

    const base = o.bestBase ? Math.max(S.atk, S.matk) : o.dmgType === 'phys' ? S.atk : S.matk;
    let incPct = S.dmg + (o.dmgType === 'phys' ? S.physDmg : S.magDmg);
    const elStat = ELEMENT_DMG[o.element];
    if (elStat) incPct += S[elStat];
    if (o.skill) incPct += S.skillDmg;
    if (tgt.boss) incPct += S.bossDmg;
    if (tgt.elite.length) incPct += S.eliteDmg;
    if (src.powers.executioner && hpPct(tgt) < 0.3) incPct += src.powers.executioner;
    if (src.powers.berserk) incPct += src.powers.berserk * Math.floor((1 - hpPct(src)) * 10);
    if (src.powers.deathMark && (statusStacks(tgt, 'poison') >= 5 || statusStacks(tgt, 'bleed') >= 3)) incPct += src.powers.deathMark;
    if (src.powers.burnAmp && hasStatus(tgt, 'burn')) incPct += src.powers.burnAmp;
    if (src.powers.firstStrike && !src.mem['fs:' + tgt.uid]) {
      src.mem['fs:' + tgt.uid] = 1;
      incPct += src.powers.firstStrike;
    }
    if (o.element === 'holy' && (tgt.family === 'undead' || tgt.family === 'demon')) incPct += 25;
    if (this.hooks.extraInc) incPct += this.hooks.extraInc(src, tgt);

    let dmg = base * o.mult * Math.max(0.1, 1 + incPct / 100);
    // 等級差：打比自己高等的怪傷害降低，被高等怪打傷害提高
    const gap = tgt.level - src.level;
    if (gap > LEVEL_GRACE && src.side === 'hero') dmg *= Math.max(0.2, 1 - LEVEL_GAP * (gap - LEVEL_GRACE));
    else if (-gap > LEVEL_GRACE && src.side === 'enemy') dmg *= 1 + LEVEL_GAP * (-gap - LEVEL_GRACE);

    let critChance = S.crit + (o.bonusCrit ?? 0);
    if (src.mem.evadeCrit) { critChance = 100; src.mem.evadeCrit = 0; }
    const crit = this.rng.chance(critChance / 100);
    if (crit) dmg *= Math.max(1, S.critDmg / 100);

    const dr = armorDR(o.dmgType === 'phys' ? tgt.stats.def : tgt.stats.res, src.level) * (1 - (o.pierce ?? 0));
    dmg *= 1 - dr;
    dmg *= 1 - resistOf(tgt, o.element) / 100;
    dmg *= Math.max(0.1, 1 + tgt.stats.dmgTaken / 100);
    dmg *= this.rng.float(0.92, 1.08);
    dmg = Math.max(1, dmg);

    const dealt = this.applyDamage(tgt, dmg, src, o.element, crit, false, !!o.proc);

    // 吸血
    if (S.lifesteal > 0 && src.alive && (src.kind === 'hero' || src.kind === 'monster')) {
      this.heal(src, dealt * S.lifesteal / 100, false);
    }
    // 荊棘
    if (tgt.powers.thorns && !o.proc && src.alive && src.side !== tgt.side) {
      let reflect = dealt * tgt.powers.thorns / 100;
      // 怪物的反彈有上限，避免高暴擊職業被自己的傷害秒殺
      if (tgt.side === 'enemy') reflect = Math.min(reflect, src.stats.hp * 0.08);
      this.applyDamage(src, reflect, tgt, 'phys', false, false, true);
    }

    if (!tgt.alive) return dealt;

    // 異常狀態
    const statusBonus = 1 + S.statusChance / 100;
    if (o.status) for (const st of o.status) if (this.rng.chance(st.chance * statusBonus)) this.applyStatus(tgt, st, src, dmg);
    const elStatus = ELEMENT_STATUS[o.element];
    if (elStatus && !o.proc && this.rng.chance(ELEMENT_STATUS_CHANCE * statusBonus)) this.applyStatus(tgt, { id: elStatus, chance: 1 }, src, dmg);
    if (src.mem.eliteBurn && this.rng.chance(0.3)) this.applyStatus(tgt, { id: 'burn', chance: 1 }, src, dmg);
    if (src.mem.eliteChill && this.rng.chance(0.3)) this.applyStatus(tgt, { id: 'chill', chance: 1 }, src, dmg);

    // 觸發型特效（觸發的傷害不會再觸發，避免無限連鎖）
    if (!o.proc && src.side === 'hero') {
      if (src.powers.chainOnHit && this.rng.chance(src.powers.chainOnHit / 100)) this.chainLightning(src, tgt);
      if (crit && src.powers.frostCrit && tgt.alive && this.rng.chance(src.powers.frostCrit / 100)) this.applyStatus(tgt, { id: 'freeze', chance: 1 }, src, 0);
      if (src.powers.overload && hasStatus(tgt, 'shock')) {
        const other = this.enemiesOf(src).filter(f => f !== tgt);
        if (other.length) {
          const t2 = this.rng.pick(other);
          this.ev.emit('unit:proc', { src, name: '超載', fx: 'chain', targets: [t2], element: 'lightning' });
          this.hit(src, t2, { mult: src.powers.overload / 100, dmgType: 'magic', element: 'lightning', proc: true, bestBase: true });
        }
      }
    }
    return dealt;
  }

  private chainLightning(src: Unit, first: Unit) {
    const foes = this.enemiesOf(src);
    if (!foes.length) return;
    const targets: Unit[] = [];
    let last = first;
    for (let i = 0; i < 3; i++) {
      const pool = foes.filter(f => f.alive && f !== last);
      const t = pool.length ? this.rng.pick(pool) : last;
      if (!t.alive) break;
      targets.push(t);
      last = t;
    }
    this.ev.emit('unit:proc', { src, name: '連鎖閃電', fx: 'chain', targets, element: 'lightning' });
    for (const t of targets) if (t.alive) this.hit(src, t, { mult: 1.2, dmgType: 'magic', element: 'lightning', proc: true, bestBase: true });
  }

  applyDamage(tgt: Unit, amount: number, src: Unit | null, element: Element, crit: boolean, dot: boolean, proc: boolean): number {
    if (!tgt.alive) return 0;
    let dmg = amount;
    let absorbed = 0;
    if (tgt.shield > 0) {
      absorbed = Math.min(tgt.shield, dmg);
      tgt.shield -= absorbed;
      dmg -= absorbed;
    }
    tgt.hp -= dmg;
    this.ev.emit('unit:hit', { src, tgt, amount: amount, crit, element, dot, absorbed, proc });

    if (tgt.kind === 'hero' && tgt.hp > 0 && tgt.powers.guardian && hpPct(tgt) < 0.3 && (tgt.mem.guardianReady ?? 0) <= this.time) {
      tgt.mem.guardianReady = this.time + 30;
      this.ev.emit('unit:proc', { src: tgt, name: '守護', fx: 'shield', targets: [tgt], element: 'holy' });
      this.addShield(tgt, tgt.stats.hp * tgt.powers.guardian / 100, 8);
    }
    if (tgt.hp <= 0) this.kill(tgt, src);
    return amount;
  }

  heal(u: Unit, amount: number, show: boolean) {
    if (!u.alive || amount <= 0) return;
    const before = u.hp;
    u.hp = Math.min(u.stats.hp, u.hp + amount);
    const real = u.hp - before;
    if (show && real >= 1) this.ev.emit('unit:heal', { tgt: u, amount: real });
  }

  addShield(u: Unit, amount: number, dur: number) {
    u.shield = Math.min(u.stats.hp * 1.5, u.shield + amount);
    u.shieldTime = Math.max(u.shieldTime, dur);
    this.ev.emit('unit:shield', { tgt: u, amount });
  }

  applyStatus(tgt: Unit, st: StatusApply, src: Unit, hitDmg: number) {
    if (!tgt.alive) return;
    const def = STATUSES[st.id];
    let dur = def.dur;
    if (def.disable && tgt.boss) dur *= 0.5;
    const add = st.stacks ?? 1;
    const dps = def.dot ? hitDmg * def.dot.ratio * (1 + src.stats.dotDmg / 100) : 0;
    let s = tgt.statuses.find(x => x.id === st.id);
    if (s) {
      s.stacks = Math.min(def.maxStacks, s.stacks + add);
      s.remaining = Math.max(s.remaining, dur);
      if (dps > s.dps) { s.dps = dps; s.srcUid = src.uid; }
    } else {
      s = { id: st.id, stacks: Math.min(def.maxStacks, add), remaining: dur, dps, tickAcc: 0, srcUid: src.uid };
      tgt.statuses.push(s);
    }
    // 冰緩疊滿變冰凍
    if (st.id === 'chill' && s.stacks >= def.maxStacks) {
      tgt.statuses = tgt.statuses.filter(x => x.id !== 'chill');
      this.applyStatus(tgt, { id: 'freeze', chance: 1 }, src, 0);
      recalc(tgt);
      return;
    }
    if (def.mods) recalc(tgt);
    if (def.disable && tgt.casting) this.interrupt(tgt);
    this.ev.emit('unit:status', { tgt, status: st.id, stacks: s.stacks });

    if (st.id === 'bleed' && s.stacks >= 5 && src.powers.bleedBurst) {
      tgt.statuses = tgt.statuses.filter(x => x.id !== 'bleed');
      this.ev.emit('unit:proc', { src, name: '血爆', fx: 'heavy', targets: [tgt], element: 'phys' });
      this.hit(src, tgt, { mult: src.powers.bleedBurst / 100, dmgType: 'phys', element: 'phys', proc: true });
    }
  }

  private kill(tgt: Unit, killer: Unit | null) {
    if (tgt.kind === 'hero' && tgt.powers.phoenix && (tgt.mem.phoenixReady ?? 0) <= this.time) {
      tgt.mem.phoenixReady = this.time + 120;
      tgt.hp = tgt.stats.hp * tgt.powers.phoenix / 100;
      tgt.statuses = [];
      recalc(tgt);
      this.ev.emit('unit:revive', { unit: tgt });
      this.ev.emit('unit:proc', { src: tgt, name: '浴火重生', fx: 'nova', targets: [tgt], element: 'fire' });
      return;
    }
    tgt.hp = 0;
    tgt.alive = false;
    tgt.casting = null;
    tgt.shield = 0;
    this.ev.emit('unit:death', { unit: tgt, killer });
    if (tgt.side === 'enemy') {
      const owner = killer?.ownerUid !== undefined ? this.units.find(x => x.uid === killer.ownerUid) : killer;
      if (owner && owner.alive && owner.side === 'hero') {
        if (owner.powers.killHeal) this.heal(owner, owner.stats.hp * owner.powers.killHeal / 100, true);
        if (owner.powers.timeWarp) for (const k in owner.cds) owner.cds[k] = Math.max(0, owner.cds[k] - owner.powers.timeWarp);
      }
      this.hooks.onKill(tgt, owner ?? killer);
    } else if (tgt.kind === 'hero') {
      this.hooks.onHeroDeath();
    }
  }

  /** 直接施放技能（給 UI 手動施放或測試用） */
  forceSkill(u: Unit, def: SkillDef, rank: number) {
    this.executeSkill(u, def, rank, false);
  }
}

export type { FxKey };
