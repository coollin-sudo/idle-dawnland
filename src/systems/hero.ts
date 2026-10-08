import { armorDR, evadeChance } from '@/core/formulas';
import { TITLE_MAP } from '@/data/titles';
import { BASE_CONVERSION, computeStats, PRIMARY, type Conversion, type Mod, type StatBlock } from '@/core/stats';
import type { ClassDef, GameState, Item, SlotId } from '@/core/types';
import { ADVANCES, CLASSES } from '@/data/classes';
import { SET_MAP, SLOTS, UNIQUE_MAP } from '@/data/items';
import { ACHIEVEMENTS, CODEX_BONUS_PER_TIER, CODEX_TIERS, STAR_NODES } from '@/data/meta';
import { PET_MAP, petPassiveMult } from '@/data/pets';
import { BLESSING_MAP } from '@/data/shop';
import { getSkill } from '@/data/skills';
import { TALENT_TREES } from '@/data/talents';
import { itemMods } from './items';

export type EquipOverride = Partial<Record<SlotId, Item | null>>;

export const classOf = (s: GameState): ClassDef => CLASSES[s.hero.classId];

function equipped(s: GameState, ov?: EquipOverride): Item[] {
  const out: Item[] = [];
  for (const slot of SLOTS) {
    const it = ov && slot in ov ? ov[slot] : s.equipment[slot];
    if (it) out.push(it);
  }
  return out;
}

export function heroStatBase(s: GameState): Partial<StatBlock> {
  const c = classOf(s);
  const h = s.hero;
  const base: Partial<StatBlock> = {};
  for (const p of PRIMARY) base[p] = c.base[p] + c.growth[p] * (h.level - 1) + h.alloc[p];
  const b = c.baseStats;
  base.hp = b.hp + h.level * 10;
  base.mp = b.mp + h.level * 2;
  base.atk = b.atk;
  base.matk = b.matk;
  base.def = b.def + h.level;
  base.res = b.res + h.level * 0.8;
  base.crit = b.crit;
  base.critDmg = b.critDmg;
  base.mpRegen = b.mpRegen + h.level * 0.04;
  base.hpRegen = 2 + h.level * 1.2;
  return base;
}

export function heroConversions(s: GameState): Conversion[] {
  return [BASE_CONVERSION, classOf(s).conversion];
}

export function setCounts(items: Item[]): Map<string, number> {
  const m = new Map<string, number>();
  for (const it of items) if (it.set) m.set(it.set, (m.get(it.set) ?? 0) + 1);
  return m;
}

export function talentSpent(s: GameState): number {
  return Object.values(s.hero.talentRanks).reduce((a, b) => a + b, 0);
}
export const talentTotal = (s: GameState) => Math.floor(s.hero.level / 3);

export function codexTiers(s: GameState): number {
  let n = 0;
  for (const k in s.codex) for (const t of CODEX_TIERS) if (s.codex[k] >= t) n++;
  return n;
}

/** 所有永久與暫時的加成來源（不含戰鬥中的 buff） */
export function heroMods(s: GameState, ov?: EquipOverride): Mod[] {
  const mods: Mod[] = [];
  const h = s.hero;
  if (h.advId) mods.push(...ADVANCES[h.advId].mods);

  const items = equipped(s, ov);
  for (const it of items) mods.push(...itemMods(it));
  for (const [setId, n] of setCounts(items)) {
    const set = SET_MAP.get(setId);
    if (!set) continue;
    if (n >= 2) mods.push(...set.bonus2);
    if (n >= 4) mods.push(...set.bonus4.mods);
  }

  const tree = TALENT_TREES[h.classId];
  for (const node of tree.nodes) {
    const r = h.talentRanks[node.id] ?? 0;
    if (r > 0 && node.mods) mods.push(...node.mods(r));
  }

  // 寵物：出戰寵物完整加成，其他寵物 25% 收藏加成
  for (const id in s.pets.owned) {
    const ps = s.pets.owned[id];
    const def = PET_MAP.get(id);
    if (!def) continue;
    const k = petPassiveMult(ps.level, ps.stars) * (id === s.pets.active ? 1 : 0.25);
    mods.push({ ...def.passive, value: def.passive.value * k });
  }

  for (const a of ACHIEVEMENTS) {
    const tier = s.achievements[a.id] ?? 0;
    if (tier > 0) mods.push({ ...a.reward, value: a.reward.value * tier });
  }

  const title = s.title ? TITLE_MAP.get(s.title) : undefined;
  if (title && title.unlocked(s)) mods.push(title.mod);

  const ct = codexTiers(s);
  if (ct > 0) mods.push({ stat: 'dmg', kind: 'flat', value: ct * CODEX_BONUS_PER_TIER }, { stat: 'hp', kind: 'inc', value: ct * CODEX_BONUS_PER_TIER });

  for (const node of STAR_NODES) {
    const r = s.rebirth.ranks[node.id] ?? 0;
    if (r > 0 && node.mods) mods.push(...node.mods(r));
  }

  const now = Date.now();
  for (const b of s.buffs) {
    if (b.until <= now) continue;
    const def = BLESSING_MAP.get(b.id);
    if (def) mods.push(...def.mods);
  }

  const pw = heroPowers(s, ov);
  if (pw.greed) mods.push({ stat: 'dmgTaken', kind: 'flat', value: pw.greed });
  if (pw.petBond) mods.push({ stat: 'petDmg', kind: 'flat', value: pw.petBond });
  return mods;
}

export function heroPowers(s: GameState, ov?: EquipOverride): Record<string, number> {
  const p: Record<string, number> = {};
  const add = (id: string, v: number) => { p[id] = (p[id] ?? 0) + v; };
  const items = equipped(s, ov);
  for (const it of items) {
    if (!it.unique) continue;
    const u = UNIQUE_MAP.get(it.unique);
    if (u) add(u.power.id, u.power.value * (it.rarity === 5 ? 1.3 : 1));
  }
  for (const [setId, n] of setCounts(items)) {
    const set = SET_MAP.get(setId);
    if (set && n >= 4 && set.bonus4.power) add(set.bonus4.power.id, set.bonus4.power.value);
  }
  for (const node of TALENT_TREES[s.hero.classId].nodes) {
    const r = s.hero.talentRanks[node.id] ?? 0;
    if (r > 0 && node.power) add(node.power.id, node.power.value(r));
  }
  // 千羽箭袋的額外目標不疊加超過 3
  if (p.multishot) p.multishot = Math.min(3, Math.round(p.multishot));
  return p;
}

export function heroStats(s: GameState, ov?: EquipOverride): StatBlock {
  const st = computeStats({ base: heroStatBase(s), mods: heroMods(s, ov), conversions: heroConversions(s) });
  st.cdr = Math.min(40, st.cdr);
  return st;
}

/** 戰力：攻擊期望值與有效生命的綜合指標，用來比較裝備好壞 */
export function combatPower(s: GameState, st: StatBlock): number {
  const c = classOf(s);
  const magic = c.basic.dmgType === 'magic';
  const atk = magic ? st.matk : st.atk;
  const elements = loadoutElements(s);
  let elemBonus = 0;
  for (const el of elements) {
    const key = ({ fire: 'fireDmg', ice: 'iceDmg', lightning: 'lightningDmg', holy: 'holyDmg', shadow: 'shadowDmg' } as const)[el as 'fire'];
    if (key) elemBonus += st[key] / elements.length;
  }
  // 持續傷害、異常觸發、寵物、精英傷害等次要輸出也折算進去
  const minor = st.dotDmg * 0.25 + st.statusChance * 0.3 + st.petDmg * 0.1 + st.eliteDmg * 0.1;
  const inc = 1 + (st.dmg + (magic ? st.magDmg : st.physDmg) + elemBonus + st.skillDmg * 0.4 + st.bossDmg * 0.15 + minor) / 100;
  const crit = 1 + Math.min(100, st.crit) / 100 * Math.max(0, st.critDmg - 100) / 100;
  const speed = 1 + st.haste / 100;
  const cd = 1 + st.cdr / 150;
  // 魔力回復讓技能更常施放
  const mana = 1 + Math.min(0.15, st.mpRegen / Math.max(20, st.mp) * 0.6);
  const offense = atk * inc * crit * speed * cd * mana;
  const lvl = s.hero.level;
  const dr = (armorDR(st.def, lvl) + armorDR(st.res, lvl)) / 2;
  const ev = evadeChance(st.eva, lvl) * 0.5;
  const sustain = 1 + st.lifesteal / 40 + (st.hpRegen * 8) / Math.max(1, st.hp) + (c.id === 'cleric' ? st.healPower / 200 : 0);
  // 元素抗性：假設約一半的受到傷害是元素傷害
  const res = (st.fireRes + st.iceRes + st.lightningRes + st.holyRes + st.shadowRes) / 5;
  const resMult = 1 / Math.max(0.3, 1 - Math.min(75, Math.max(0, res)) / 100 * 0.5);
  const ehp = st.hp / (1 - dr) / (1 - ev) / Math.max(0.2, 1 + st.dmgTaken / 100) * sustain * resMult;
  return Math.round(offense * 3 + ehp * 0.4);
}

function loadoutElements(s: GameState): string[] {
  const els: string[] = [];
  for (const id of s.hero.loadout) {
    if (!id) continue;
    for (const e of getSkill(id).effects) if (e.type === 'damage' && e.element !== 'phys') els.push(e.element);
  }
  const basic = classOf(s).basic.element;
  if (basic !== 'phys') els.push(basic);
  return els;
}

export function powerWith(s: GameState, ov?: EquipOverride): number {
  return combatPower(s, heroStats(s, ov));
}

/** 這件裝備換上去會讓戰力變化多少（取兩個戒指位中較差的那個比較） */
export function upgradeDelta(s: GameState, it: Item): { delta: number; slot: SlotId } {
  const base = powerWith(s);
  const slots: SlotId[] = it.slot === 'ring' ? ['ring1', 'ring2'] : [it.slot as SlotId];
  let best = { delta: -Infinity, slot: slots[0] };
  for (const sl of slots) {
    const d = powerWith(s, { [sl]: it }) - base;
    if (d > best.delta) best = { delta: d, slot: sl };
  }
  return best;
}
