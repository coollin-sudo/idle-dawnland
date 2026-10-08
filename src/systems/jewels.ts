import type { Game } from '@/core/game';
import type { Item } from '@/core/types';
import type { Unit } from '@/core/unit';
import {
  JEWEL_MAX_TIER, JEWELS, MAX_SOCKETS, combineCost, jewelKey, jewelName, parseJewel, punchCost, unsocketCost,
} from '@/data/jewels';
import { findItem } from './forge';

export function addJewel(g: Game, key: string, n = 1) {
  const s = g.state;
  s.jewels[key] = (s.jewels[key] ?? 0) + n;
}

/** 依怪物等級決定魔晶等級：大致每 25 級升一階，偶爾高一階 */
function rollTier(g: Game, level: number) {
  let t = Math.min(JEWEL_MAX_TIER, Math.floor(level / 25));
  if (t < JEWEL_MAX_TIER && g.rng.chance(0.15)) t++;
  if (t > 0 && g.rng.chance(0.3)) t--;
  return t;
}

/** 擊殺掉落魔晶：首領必掉、精英 6%、一般 0.4% */
export function jewelDrop(g: Game, u: Unit, mult = 1) {
  const chance = u.boss ? 1 : u.elite.length ? 0.06 : 0.004;
  if (!g.rng.chance(Math.min(1, chance * mult))) return;
  const n = u.boss ? g.rng.int(1, 2) : 1;
  for (let i = 0; i < n; i++) {
    const key = jewelKey(g.rng.pick(JEWELS).id, rollTier(g, u.level));
    addJewel(g, key);
    g.log(`獲得魔晶「${jewelName(key)}」`, 'loot');
  }
  g.count('jewelsFound', n);
}

/** 拆掉裝備上的魔晶（分解、販售、碎裂時）退回魔晶袋 */
export function returnJewels(g: Game, it: Item) {
  for (const k of it.sockets ?? []) if (k) addJewel(g, k);
}

export function socketJewel(g: Game, uid: number, key: string): boolean {
  const f = findItem(g, uid);
  if (!f || !(g.state.jewels[key] > 0)) return false;
  const slots = f.item.sockets ?? [];
  const i = slots.indexOf(null);
  if (i < 0) return false;
  slots[i] = key;
  g.state.jewels[key]--;
  if (!g.state.jewels[key]) delete g.state.jewels[key];
  if (f.where === 'equip') g.heroChanged();
  g.touch();
  return true;
}

export function unsocketJewel(g: Game, uid: number, index: number): boolean {
  const f = findItem(g, uid);
  const key = f?.item.sockets?.[index];
  if (!f || !key) return false;
  const p = parseJewel(key);
  const cost = unsocketCost(p?.tier ?? 0);
  if (g.state.cur.gold < cost) { g.toast('金幣不足', 'warn', '💰'); return false; }
  g.state.cur.gold -= cost;
  f.item.sockets![index] = null;
  addJewel(g, key);
  if (f.where === 'equip') g.heroChanged();
  g.touch();
  return true;
}

export function canPunch(it: Item) {
  return (it.sockets?.length ?? 0) < MAX_SOCKETS[it.rarity];
}

export function punchSocket(g: Game, uid: number): boolean {
  const f = findItem(g, uid);
  if (!f || !canPunch(f.item)) return false;
  const cost = punchCost(f.item.sockets?.length ?? 0, f.item.ilvl);
  const s = g.state;
  if (s.cur.gold < cost.gold || s.cur.stones < cost.stones) { g.toast('材料不足', 'warn', '🔨'); return false; }
  s.cur.gold -= cost.gold;
  s.cur.stones -= cost.stones;
  f.item.sockets = [...(f.item.sockets ?? []), null];
  g.toast('打孔成功！', 'good', '🔨');
  g.touch();
  return true;
}

/** 3 顆同級合成 1 顆高一級 */
export function combineJewel(g: Game, key: string): boolean {
  const p = parseJewel(key);
  const s = g.state;
  if (!p || p.tier >= JEWEL_MAX_TIER || (s.jewels[key] ?? 0) < 3) return false;
  const cost = combineCost(p.tier);
  if (s.cur.gold < cost) { g.toast('金幣不足', 'warn', '💰'); return false; }
  s.cur.gold -= cost;
  s.jewels[key] -= 3;
  if (!s.jewels[key]) delete s.jewels[key];
  const up = jewelKey(p.def.id, p.tier + 1);
  addJewel(g, up);
  g.toast(`合成出「${jewelName(up)}」！`, 'epic', '✨');
  g.touch();
  return true;
}
