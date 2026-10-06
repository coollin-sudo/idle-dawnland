import { armorPower, enhanceMult, weaponPower } from '@/core/formulas';
import type { Rng } from '@/core/rng';
import { flat, statIsPct, type Mod } from '@/core/stats';
import type { AffixDef, AffixRoll, ClassId, Item, ItemSlotKind, Rarity, UniqueDef } from '@/core/types';
import {
  AFFIX_MAP, AFFIXES, ARMOR_NOUN, OFFHAND_NOUN, RARITIES, RARITY_WEIGHTS, SET_MAP, SETS, TIER_NAMES, UNIQUE_MAP, UNIQUES, WEAPON_NOUN, tierOf,
} from '@/data/items';

const ITEM_KINDS: ItemSlotKind[] = ['weapon', 'offhand', 'helmet', 'armor', 'gloves', 'belt', 'boots', 'amulet', 'ring'];
const KIND_WEIGHT: Record<ItemSlotKind, number> = { weapon: 1.2, offhand: 1, helmet: 1, armor: 1, gloves: 1, belt: 1, boots: 1, amulet: 0.8, ring: 1.4 };

const EPITHET: Record<string, string> = {
  atk: '鋒利', matk: '奧秘', atkPct: '殘暴', matkPct: '睿智', str: '剛猛', dex: '靈巧', int: '博學', vit: '堅毅', allStats: '完美',
  hp: '強壯', hpPct: '生機', def: '堅固', res: '辟邪', eva: '飄逸', crit: '銳利', critDmg: '致命', haste: '迅捷', cdr: '流轉',
  lifesteal: '嗜血', hpRegen: '再生', mpRegen: '冥想', dmg: '毀滅', physDmg: '蠻力', magDmg: '咒術', fireDmg: '熾熱', iceDmg: '寒冰',
  lightningDmg: '雷鳴', holyDmg: '聖潔', shadowDmg: '幽暗', skillDmg: '精通', bossDmg: '屠龍', dotDmg: '腐蝕', dmgTaken: '守護',
  fireRes: '耐火', iceRes: '耐寒', lightningRes: '絕緣', shadowRes: '淨化', statusChance: '詛咒', healPower: '慈悲', petDmg: '馴獸',
  goldFind: '富貴', xpGain: '賢者', magicFind: '幸運',
};

export interface ItemCtx {
  rng: Rng;
  nextUid: () => number;
  classId: ClassId;
}

export interface GenOpts {
  ilvl: number;
  rarity: Rarity;
  slot?: ItemSlotKind;
  uniqueId?: string;
  setId?: string;
}

// ---------------------------------------------------------------------
// 稀有度
// ---------------------------------------------------------------------
export function rollRarity(rng: Rng, source: 'normal' | 'elite' | 'boss' | 'chest', magicFind: number, difficulty: number, mythicBonus = 0): Rarity {
  const base = source === 'chest' ? [0, 500, 380, 100, 20, 0] : RARITY_WEIGHTS[source === 'elite' ? 'elite' : source];
  const w = base.slice();
  const mf = 1 + Math.max(0, magicFind) / 100;
  for (let r = 2; r < w.length; r++) w[r] *= mf * (1 + difficulty * 0.35);
  if ((source === 'boss' || source === 'chest') && difficulty >= 1) w[5] = 4 * difficulty + mythicBonus;
  return Math.max(0, rng.weightedIndex(w)) as Rarity;
}

// ---------------------------------------------------------------------
// 基礎屬性
// ---------------------------------------------------------------------
function implicitFor(kind: ItemSlotKind, classId: ClassId, ilvl: number, mult: number): Mod[] {
  const wp = weaponPower(ilvl) * mult;
  const ap = armorPower(ilvl) * mult;
  const r = (n: number) => Math.max(1, Math.round(n));
  const r1 = (n: number) => Math.round(n * 10) / 10;
  switch (kind) {
    case 'weapon':
      switch (classId) {
        case 'warrior': return [flat('atk', r(wp))];
        case 'ranger': return [flat('atk', r(wp * 0.92)), flat('crit', r1(2 + ilvl * 0.02))];
        case 'mage': return [flat('matk', r(wp))];
        case 'cleric': return [flat('matk', r(wp * 0.95)), flat('hp', r(ilvl * 3 * mult))];
      }
      break;
    case 'offhand':
      switch (classId) {
        case 'warrior': return [flat('def', r(ap * 1.4)), flat('hp', r(ilvl * 5 * mult))];
        case 'ranger': return [flat('atk', r(wp * 0.22)), flat('haste', r1(3 + ilvl * 0.02))];
        case 'mage': return [flat('matk', r(wp * 0.25)), flat('mp', r(10 + ilvl * 2))];
        case 'cleric': return [flat('matk', r(wp * 0.2)), flat('healPower', r1(6 + ilvl * 0.05))];
      }
      break;
    case 'helmet': return [flat('def', r(ap * 0.6)), flat('hp', r(ilvl * 4 * mult))];
    case 'armor': return [flat('def', r(ap * 1.3)), flat('res', r(ap * 0.5)), flat('hp', r(ilvl * 7 * mult))];
    case 'gloves': return [flat('def', r(ap * 0.45)), flat('crit', r1((1 + ilvl * 0.01) * mult))];
    case 'belt': return [flat('hp', r(ilvl * 8 * mult)), flat('def', r(ap * 0.3))];
    case 'boots': return [flat('def', r(ap * 0.5)), flat('eva', r(ilvl * 1.2 * mult))];
    case 'amulet': return [flat('allStats', r((2 + ilvl * 0.22) * mult))];
    case 'ring': return [flat('dmg', r1((2 + ilvl * 0.04) * mult))];
  }
  return [];
}

// ---------------------------------------------------------------------
// 詞綴
// ---------------------------------------------------------------------
export function affixRange(def: AffixDef, ilvl: number): [number, number] {
  const g = 1 + def.growth * (ilvl - 1);
  return [def.min * g, def.max * g];
}

function roundAffix(def: AffixDef, v: number): number {
  if (statIsPct(def.stat) || def.kind !== 'flat' || Math.abs(v) < 10) return Math.round(v * 10) / 10;
  return Math.round(v);
}

export function rollAffixValue(rng: Rng, def: AffixDef, ilvl: number, mult = 1): AffixRoll {
  const [lo, hi] = affixRange(def, ilvl);
  const q = rng.next();
  const raw = (lo + (hi - lo) * q) * mult;
  let value = roundAffix(def, raw);
  if (value === 0) value = def.min < 0 ? -0.1 : 0.1;
  return { id: def.id, value, q: Math.round(q * 100) / 100 };
}

function affixPool(kind: ItemSlotKind, ilvl: number, exclude: Set<string>): AffixDef[] {
  return AFFIXES.filter(a => !exclude.has(a.id) && (a.minIlvl ?? 0) <= ilvl && (a.slots === 'all' || a.slots.includes(kind)));
}

export function rollAffix(rng: Rng, kind: ItemSlotKind, ilvl: number, exclude: Set<string>): AffixRoll | null {
  const def = rng.weighted(affixPool(kind, ilvl, exclude), a => a.weight);
  return def ? rollAffixValue(rng, def, ilvl) : null;
}

// ---------------------------------------------------------------------
// 產生裝備
// ---------------------------------------------------------------------
export function pickKind(rng: Rng): ItemSlotKind {
  return rng.weighted(ITEM_KINDS, k => KIND_WEIGHT[k])!;
}

function baseName(kind: ItemSlotKind, classId: ClassId, ilvl: number): string {
  const tier = TIER_NAMES[tierOf(ilvl)];
  if (kind === 'weapon') return tier + WEAPON_NOUN[classId];
  if (kind === 'offhand') return tier + OFFHAND_NOUN[classId];
  return tier + ARMOR_NOUN[kind];
}

export function pickUnique(rng: Rng, kind: ItemSlotKind | undefined, classId: ClassId, ilvl: number): UniqueDef | undefined {
  const pool = UNIQUES.filter(u => u.minIlvl <= ilvl && (!kind || u.slot === kind) && (!u.classId || u.classId === classId)
    && ((u.slot !== 'weapon' && u.slot !== 'offhand') || u.classId === classId));
  return pool.length ? rng.pick(pool) : undefined;
}

export function generateItem(ctx: ItemCtx, o: GenOpts): Item {
  const { rng, classId } = ctx;
  const ilvl = Math.max(1, Math.round(o.ilvl));
  let rarity = o.rarity;
  let kind = o.slot ?? pickKind(rng);

  // 傳說以上：嘗試變成具名傳說
  let unique: UniqueDef | undefined;
  if (o.uniqueId) unique = UNIQUE_MAP.get(o.uniqueId);
  else if (rarity >= 4) unique = pickUnique(rng, o.slot, classId, ilvl) ?? pickUnique(rng, undefined, classId, ilvl);
  if (unique) kind = unique.slot;
  if (rarity >= 4 && !unique) rarity = 3;

  const set = o.setId ? SET_MAP.get(o.setId) : undefined;
  if (set) {
    rarity = Math.max(rarity, 3) as Rarity;
    const piece = set.pieces.find(p => p.slot === kind) ?? set.pieces[0];
    kind = piece.slot;
  }

  const R = RARITIES[rarity];
  const implicit = implicitFor(kind, classId, ilvl, R.implicit);
  const affixes: AffixRoll[] = [];
  const used = new Set<string>();

  if (unique) {
    const mythicMult = rarity === 5 ? 1.25 : 1;
    for (const ua of unique.affixes) {
      const def = AFFIX_MAP.get(ua.id)!;
      affixes.push(rollAffixValue(rng, def, ilvl, (ua.mult ?? 1) * mythicMult));
      used.add(ua.id);
    }
    if (rarity === 5) {
      const extra = rollAffix(rng, kind, ilvl, used);
      if (extra) affixes.push(extra);
    }
  } else {
    for (let i = 0; i < R.affixes; i++) {
      const a = rollAffix(rng, kind, ilvl, used);
      if (!a) break;
      affixes.push(a);
      used.add(a.id);
    }
  }

  let name: string;
  if (unique) name = unique.name;
  else if (set) name = set.pieces.find(p => p.slot === kind)?.name ?? set.name;
  else {
    name = baseName(kind, classId, ilvl);
    if (rarity >= 2 && affixes.length) name = (EPITHET[affixes[0].id] ?? '') + '的' + name;
  }

  return {
    uid: ctx.nextUid(), slot: kind, base: kind, name, rarity, ilvl, implicit, affixes, enh: 0,
    unique: unique?.id, set: set?.id, isNew: true,
    classId: kind === 'weapon' || kind === 'offhand' ? classId : undefined,
  };
}

/** 套裝掉落：隨機一套（優先本職業） */
export function pickSet(rng: Rng, classId: ClassId) {
  const pool = SETS.filter(s => !s.classId || s.classId === classId);
  return rng.pick(pool);
}

// ---------------------------------------------------------------------
// 裝備數值
// ---------------------------------------------------------------------
export function affixMod(a: AffixRoll): Mod {
  const def = AFFIX_MAP.get(a.id)!;
  return { stat: def.stat, kind: def.kind, value: a.value };
}

export function itemMods(it: Item): Mod[] {
  const em = enhanceMult(it.enh);
  const out: Mod[] = it.implicit.map(m => ({ ...m, value: statIsPct(m.stat) ? Math.round(m.value * em * 10) / 10 : Math.round(m.value * em) }));
  for (const a of it.affixes) out.push(affixMod(a));
  return out;
}

export const rarityColor = (r: Rarity) => RARITIES[r].color;
export const SET_COLOR = '#4ae0a0';
export const itemColor = (it: Item) => (it.set ? SET_COLOR : RARITIES[it.rarity].color);

export function itemDisplayName(it: Item): string {
  return (it.enh > 0 ? `+${it.enh} ` : '') + it.name;
}

/** 裝備需求等級：物品等級 −3 */
export const reqLevel = (it: Item) => Math.max(1, it.ilvl - 3);

export function canEquip(it: Item, classId: ClassId, level: number): boolean {
  if (level < reqLevel(it)) return false;
  if (it.slot === 'weapon' || it.slot === 'offhand') return it.classId === classId;
  return true;
}
