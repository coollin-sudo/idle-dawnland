import type { Game } from '@/core/game';
import { fineCraftPrice } from '@/core/formulas';
import type { Item, ItemSlotKind, SlotId } from '@/core/types';
import { AFFIX_MAP, SLOTS, UNIQUES } from '@/data/items';
import { STAR_NODES } from '@/data/meta';
import { rollAffix, rollAffixValue, generateItem, rollRarity, itemDisplayName, reqLevel, QUALITY_FLOOR, UTILITY_STATS } from './items';
import { itemCtx, receiveItem } from './loot';

export const MAX_ENH = 20;
/** 從 +n 強化到 +n+1 的成功率 */
export const ENH_RATES = [100, 100, 100, 95, 90, 80, 70, 62, 55, 48, 42, 36, 31, 27, 23, 19, 16, 13, 10, 8];
export const ENH_DOWN_FROM = 5;
export const ENH_BREAK_FROM = 10;

export function findItem(g: Game, uid: number): { item: Item; where: 'inv' | 'equip' | 'alt'; slot?: SlotId } | null {
  for (const sl of SLOTS) {
    const it = g.state.equipment[sl];
    if (it?.uid === uid) return { item: it, where: 'equip', slot: sl };
  }
  // 另一套配裝（還沒換上的那套）
  for (const sl of SLOTS) {
    const it = g.state.gear?.alt[sl];
    if (it?.uid === uid) return { item: it, where: 'alt', slot: sl };
  }
  const it = g.state.inventory.find(i => i.uid === uid);
  return it ? { item: it, where: 'inv' } : null;
}

export function enhanceBonus(g: Game) {
  const node = STAR_NODES.find(n => n.special === 'enhance')!;
  return (g.state.rebirth.ranks[node.id] ?? 0) * (node.per ?? 0);
}

export function enhanceCost(it: Item) {
  return {
    stones: 1 + Math.floor(it.enh / 3),
    gold: Math.round((60 + it.ilvl * 14) * Math.pow(it.enh + 1, 1.6)),
  };
}

export function enhanceRate(g: Game, it: Item) {
  return Math.min(100, ENH_RATES[it.enh] + enhanceBonus(g));
}

export type EnhanceResult = 'success' | 'fail' | 'down' | 'break' | 'protected';

export function enhance(g: Game, uid: number, useProtect: boolean): EnhanceResult | null {
  const f = findItem(g, uid);
  if (!f) return null;
  const it = f.item;
  const c = g.state.cur;
  if (it.enh >= MAX_ENH) { g.toast('已達強化上限', 'warn'); return null; }
  const cost = enhanceCost(it);
  if (c.stones < cost.stones) { g.toast('強化石不足', 'warn'); return null; }
  if (c.gold < cost.gold) { g.toast('金幣不足', 'warn'); return null; }
  const risky = it.enh >= ENH_DOWN_FROM;
  if (useProtect && risky && c.protect < 1) { g.toast('保護卷軸不足', 'warn'); return null; }
  c.stones -= cost.stones;
  c.gold -= cost.gold;
  g.count('enhanceTries');

  let result: EnhanceResult;
  if (g.rng.chance(enhanceRate(g, it) / 100)) {
    it.enh++;
    g.countMax('enhanceMax', it.enh);
    result = 'success';
    if (it.enh >= 10) g.toast(`強化成功！${itemDisplayName(it)}`, it.enh >= 15 ? 'legend' : 'epic', '🔨');
  } else if (!risky) {
    result = 'fail';
  } else if (useProtect) {
    c.protect--;
    result = 'protected';
  } else if (it.enh >= ENH_BREAK_FROM) {
    if (f.where === 'equip') g.state.equipment[f.slot!] = null;
    else if (f.where === 'alt') g.state.gear.alt[f.slot!] = null;
    else g.state.inventory.splice(g.state.inventory.indexOf(it), 1);
    result = 'break';
    // 鑲在上面的魔晶不會跟著碎掉
    for (const k of it.sockets ?? []) if (k) g.state.jewels[k] = (g.state.jewels[k] ?? 0) + 1;
    g.toast(`${itemDisplayName(it)} 碎裂了……${it.sockets?.some(Boolean) ? '（魔晶已退回）' : ''}`, 'bad', '💔');
  } else {
    it.enh--;
    result = 'down';
  }
  g.ev.emit('forge:enhance', { item: it, result });
  if (f.where === 'equip') g.heroChanged();
  g.touch();
  return result;
}

// ---------------------------------------------------------------------
// 重鑄
// ---------------------------------------------------------------------
export function reforgeCost(it: Item, mode: 'reroll' | 'value') {
  const base = Math.round((6 + it.ilvl * 0.7) * (1 + it.rarity * 0.6));
  return mode === 'reroll'
    ? { essence: base, gold: Math.round(200 + it.ilvl * 40) }
    : { essence: Math.ceil(base / 2), gold: Math.round(100 + it.ilvl * 20) };
}

/** reroll：換成新的詞綴；value：同詞綴重骰數值 */
export function reforge(g: Game, uid: number, index: number, mode: 'reroll' | 'value') {
  const f = findItem(g, uid);
  if (!f) return;
  const it = f.item;
  if (it.unique && mode === 'reroll') return g.toast('傳說裝備的詞綴只能重骰數值', 'warn');
  const a = it.affixes[index];
  if (!a) return;
  const cost = reforgeCost(it, mode);
  const c = g.state.cur;
  if (c.essence < cost.essence) return g.toast('精華不足', 'warn');
  if (c.gold < cost.gold) return g.toast('金幣不足', 'warn');
  c.essence -= cost.essence;
  c.gold -= cost.gold;
  g.count('reforges');
  if (mode === 'value') {
    const def = AFFIX_MAP.get(a.id)!;
    const uniqueMult = it.unique ? (UNIQUES.find(u => u.id === it.unique)?.affixes.find(x => x.id === a.id)?.mult ?? 1) * (it.rarity === 5 ? 1.25 : 1) : 1;
    it.affixes[index] = rollAffixValue(g.rng, def, it.ilvl, uniqueMult, QUALITY_FLOOR[it.rarity]);
  } else {
    const exclude = new Set(it.affixes.map(x => x.id));
    const utility = UTILITY_STATS.includes(AFFIX_MAP.get(a.id)?.stat ?? '');
    const next = rollAffix(g.rng, it.slot, it.ilvl, exclude, g.state.hero.classId, QUALITY_FLOOR[it.rarity], utility);
    if (next) it.affixes[index] = next;
  }
  if (f.where === 'equip') g.heroChanged();
  g.touch();
}

// ---------------------------------------------------------------------
// 打造
// ---------------------------------------------------------------------
export function craftCost(level: number) {
  return { essence: 25 + level * 3, gold: 500 + level * 120 };
}
export const LEGEND_SHARDS = 50;

/** 精工打造：只花金幣，物品等級比角色高 3 級、稀有度較好（保底史詩），是金幣的長期消耗 */
export const FINE_CRAFT_ILVL = 3;
export function fineCraft(g: Game, slot: ItemSlotKind) {
  const c = g.state.cur;
  const L = g.state.hero.level;
  const price = fineCraftPrice(L);
  if (c.gold < price) return g.toast('金幣不足', 'warn');
  c.gold -= price;
  const rarity = Math.max(3, rollRarity(g.rng, 'chest', 50, g.state.progress.difficulty));
  const it = generateItem(itemCtx(g), { ilvl: L + FINE_CRAFT_ILVL, rarity: rarity as 3, slot });
  receiveItem(g, it);
  g.toast(`精工打造完成：${it.name}`, it.rarity >= 4 ? 'legend' : 'epic', '⚒️');
  g.count('crafted');
  g.touch();
}

export function craft(g: Game, slot: ItemSlotKind, legendary: boolean) {
  const c = g.state.cur;
  const L = g.state.hero.level;
  if (legendary) {
    if (c.shards < LEGEND_SHARDS) return g.toast('傳說碎片不足', 'warn');
    c.shards -= LEGEND_SHARDS;
    receiveItem(g, generateItem(itemCtx(g), { ilvl: L, rarity: 4, slot }));
  } else {
    const cost = craftCost(L);
    if (c.essence < cost.essence) return g.toast('精華不足', 'warn');
    if (c.gold < cost.gold) return g.toast('金幣不足', 'warn');
    c.essence -= cost.essence;
    c.gold -= cost.gold;
    const rarity = Math.max(2, rollRarity(g.rng, 'chest', 0, 0));
    const it = generateItem(itemCtx(g), { ilvl: L, rarity: rarity as 2, slot });
    receiveItem(g, it);
    g.toast(`打造完成：${it.name}`, it.rarity >= 3 ? 'epic' : 'good', '⚒️');
  }
  g.count('crafted');
  g.touch();
}

// ---------------------------------------------------------------------
// 裝備操作
// ---------------------------------------------------------------------
export function equipItem(g: Game, uid: number, slot?: SlotId) {
  const s = g.state;
  const idx = s.inventory.findIndex(i => i.uid === uid);
  if (idx < 0) return;
  const it = s.inventory[idx];
  if ((it.slot === 'weapon' || it.slot === 'offhand') && it.classId !== s.hero.classId) return g.toast('職業不符', 'warn');
  if (s.hero.level < reqLevel(it)) return g.toast(`需要等級 ${reqLevel(it)}`, 'warn');
  let target: SlotId;
  if (it.slot === 'ring') target = slot === 'ring1' || slot === 'ring2' ? slot : !s.equipment.ring1 ? 'ring1' : !s.equipment.ring2 ? 'ring2' : 'ring1';
  else target = it.slot as SlotId;
  s.inventory.splice(idx, 1);
  const old = s.equipment[target];
  s.equipment[target] = { ...it, isNew: false };
  if (old) s.inventory.push(old);
  g.heroChanged();
}

export function unequipItem(g: Game, slot: SlotId) {
  const s = g.state;
  const it = s.equipment[slot];
  if (!it) return;
  s.equipment[slot] = null;
  s.inventory.push(it);
  g.heroChanged();
}

export function toggleLock(g: Game, uid: number) {
  const f = findItem(g, uid);
  if (f) f.item.locked = !f.item.locked;
  g.touch();
}
