import { mobAtk, mobDef, mobEva, mobHp, mobMatk, mobRes } from '@/core/formulas';
import type { Rng } from '@/core/rng';
import { emptyStats, type Mod } from '@/core/stats';
import type { FxKey, GameState, MonsterDef } from '@/core/types';
import { recalc, type SkillSlot, type Unit } from '@/core/unit';
import { ADVANCES } from '@/data/classes';
import { ELITE_AFFIXES, ELITE_ATK, ELITE_HP, ELITE_MAP } from '@/data/elites';
import { PET_MAP } from '@/data/pets';
import { getSkill } from '@/data/skills';
import { classOf, heroConversions, heroMods, heroPowers, heroStatBase } from './hero';

export const BOSS_HP = 14;
export const BOSS_ATK = 1.45;

const ARCHETYPE_FX: Record<string, FxKey> = {
  slime: 'slam', beast: 'bite', bird: 'claw', insect: 'bite', humanoid: 'slash', undead: 'slash', golem: 'slam',
  plant: 'slam', serpent: 'bite', elemental: 'magic', eye: 'magic', dragon: 'claw', giant: 'slam', spirit: 'magic',
};

export function makeHeroUnit(s: GameState, uid: number): Unit {
  const c = classOf(s);
  const skills: SkillSlot[] = [];
  for (const id of s.hero.loadout) {
    if (!id) continue;
    const rank = s.hero.skillRanks[id] ?? 0;
    const def = getSkill(id);
    if (rank > 0 && s.hero.level >= def.unlock && (!def.advId || def.advId === s.hero.advId)) skills.push({ def, rank });
  }
  const u: Unit = {
    uid, side: 'hero', kind: 'hero', name: s.hero.name, defId: s.hero.classId, level: s.hero.level, boss: false, elite: [], slot: 0,
    statBase: heroStatBase(s), baseMods: heroMods(s), conversions: heroConversions(s), stats: emptyStats(),
    hp: 0, mp: 0, shield: 0, shieldTime: 0, alive: true, targetable: true,
    interval: c.interval, actTimer: c.interval * 0.6,
    basic: { ...c.basic, mult: 1 },
    skills, cds: {}, casting: null, statuses: [], buffs: [], resist: {}, powers: heroPowers(s), mem: {},
    size: 1, ranged: c.basic.ranged,
    look: { classId: s.hero.classId, advId: s.hero.advId, ...(s.hero.advId ? { ...c.look, ...ADVANCES[s.hero.advId].look } : c.look) },
  };
  recalc(u);
  u.hp = s.hero.hp > 0 ? Math.min(s.hero.hp, u.stats.hp) : u.stats.hp;
  u.mp = s.hero.mp > 0 ? Math.min(s.hero.mp, u.stats.mp) : u.stats.mp;
  return u;
}

/** 重新套用英雄數值（換裝、升級後），保留戰鬥中的 buff 與狀態 */
export function refreshHeroUnit(s: GameState, u: Unit): void {
  const hpRatio = u.stats.hp > 0 ? u.hp / u.stats.hp : 1;
  const fresh = makeHeroUnit(s, u.uid);
  u.level = fresh.level;
  u.statBase = fresh.statBase;
  u.baseMods = fresh.baseMods;
  u.conversions = fresh.conversions;
  u.powers = fresh.powers;
  u.skills = fresh.skills;
  u.look = fresh.look;
  recalc(u);
  if (u.alive) u.hp = Math.max(1, u.stats.hp * hpRatio);
}

export interface MonsterOpts {
  level: number;
  diffMult: number;
  boss?: boolean;
  elite?: string[];
  slot: number;
  hpMult?: number;
  atkMult?: number;
}

export function makeMonsterUnit(def: MonsterDef, o: MonsterOpts, uid: number, rng: Rng): Unit {
  const L = o.level;
  const boss = !!o.boss;
  const eliteIds = o.elite ?? [];
  let hp = mobHp(L) * (def.hp ?? 1) * o.diffMult * (o.hpMult ?? 1);
  let atkM = (def.atk ?? 1) * o.diffMult * (o.atkMult ?? 1);
  if (boss) { hp *= BOSS_HP; atkM *= BOSS_ATK; }
  if (eliteIds.length) { hp *= ELITE_HP; atkM *= ELITE_ATK; }

  const statBase = {
    hp, mp: 100,
    atk: mobAtk(L) * atkM, matk: mobMatk(L) * atkM,
    def: mobDef(L) * (def.def ?? 1) * (boss ? 1.3 : 1),
    res: mobRes(L) * (def.res ?? 1) * (boss ? 1.3 : 1),
    eva: mobEva(L) * (def.eva ?? 1),
    crit: 5, critDmg: 150, mpRegen: 0, hpRegen: boss ? hp * 0.002 : 0,
  };
  const baseMods: Mod[] = [];
  for (const id of eliteIds) baseMods.push(...(ELITE_MAP.get(id)?.mods ?? []));

  const skills: SkillSlot[] = (def.skills ?? []).map(id => ({ def: getSkill(id), rank: 1 }));
  const cds: Record<string, number> = {};
  for (const sk of skills) cds[sk.def.id] = sk.def.cd * rng.float(0.35, 0.9);

  const u: Unit = {
    uid, side: 'enemy', kind: 'monster', name: (eliteIds.length ? eliteIds.map(id => ELITE_MAP.get(id)!.name).join('・') + '的' : '') + def.name,
    defId: def.id, level: L, family: def.family, boss, elite: eliteIds, slot: o.slot,
    statBase, baseMods, conversions: [], stats: emptyStats(),
    hp: 0, mp: 100, shield: 0, shieldTime: 0, alive: true, targetable: true,
    interval: def.interval ?? (boss ? 1.6 : 1.8), actTimer: rng.float(0, 0.8),
    basic: { dmgType: def.dmgType, element: def.element, fx: def.ranged ? 'magic' : ARCHETYPE_FX[def.archetype] ?? 'claw', ranged: !!def.ranged, mult: 1 },
    skills, cds, casting: null, statuses: [], buffs: [], resist: { ...(def.resist ?? {}) }, powers: {}, mem: {},
    size: (def.size ?? 1) * (eliteIds.length ? 1.15 : 1), ranged: !!def.ranged,
    look: { monster: def.id },
  };
  recalc(u);
  u.hp = u.stats.hp;
  for (const id of eliteIds) {
    const e = ELITE_MAP.get(id);
    if (e?.setup === 'shield') { u.shield = u.stats.hp * 0.4; u.shieldTime = 9999; }
    if (e?.setup === 'thorns') u.powers.thorns = 25;
    if (e?.setup === 'burn') u.mem.eliteBurn = 1;
    if (e?.setup === 'chill') u.mem.eliteChill = 1;
  }
  return u;
}

export function rollElites(rng: Rng, level: number, count: number): string[] {
  const pool = ELITE_AFFIXES.filter(e => e.minLevel <= level);
  return rng.shuffle(pool.slice()).slice(0, count).map(e => e.id);
}

export function makePetUnit(s: GameState, hero: Unit, uid: number): Unit | null {
  const id = s.pets.active;
  if (!id) return null;
  const ps = s.pets.owned[id];
  const def = PET_MAP.get(id);
  if (!ps || !def) return null;
  const power = Math.max(hero.stats.atk, hero.stats.matk) * def.mult * (1 + ps.level * 0.03) * (1 + ps.stars * 0.3) * (1 + hero.stats.petDmg / 100);
  const u: Unit = {
    uid, side: 'hero', kind: 'pet', name: def.name, defId: def.id, level: hero.level, boss: false, elite: [], slot: 1,
    statBase: { atk: power, matk: power, crit: hero.stats.crit * 0.5, critDmg: hero.stats.critDmg, hp: 1 },
    baseMods: [], conversions: [], stats: emptyStats(),
    hp: 1, mp: 0, shield: 0, shieldTime: 0, alive: true, targetable: false,
    interval: def.interval, actTimer: 0,
    basic: { dmgType: def.element === 'phys' ? 'phys' : 'magic', element: def.element, fx: def.element === 'phys' ? 'bite' : 'magic', ranged: def.element !== 'phys', mult: 1 },
    skills: [], cds: {}, casting: null, statuses: [], buffs: [], resist: {}, powers: {}, mem: {},
    ownerUid: hero.uid, size: 0.6, ranged: true, look: { pet: def.id },
  };
  recalc(u);
  return u;
}
