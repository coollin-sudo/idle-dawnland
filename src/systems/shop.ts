import type { Game } from '@/core/game';
import { potionPrice, protectGoldPrice, stonePrice } from '@/core/formulas';
import type { Item } from '@/core/types';
import { BLESSING_MAP, GEM_SHOP, MERCHANT_REFRESH_MS, MERCHANT_SIZE } from '@/data/shop';
import { DUNGEON_MAP } from '@/data/dungeons';
import { generateItem, rollRarity } from './items';
import { itemCtx, receiveItem } from './loot';
import { dungeonEntries } from './activities';

export const PROTECT_GEMS = 25;

export function buyPotion(g: Game, tier: 0 | 1 | 2, n: number) {
  const cost = potionPrice(tier, g.state.hero.level) * n;
  if (g.state.cur.gold < cost) return g.toast('金幣不足', 'warn');
  g.state.cur.gold -= cost;
  g.state.potions[tier] += n;
  g.touch();
}

export function buyStones(g: Game, n: number) {
  const cost = stonePrice(g.state.hero.level) * n;
  if (g.state.cur.gold < cost) return g.toast('金幣不足', 'warn');
  g.state.cur.gold -= cost;
  g.state.cur.stones += n;
  g.touch();
}

export function buyProtectGold(g: Game, n = 1) {
  const cost = protectGoldPrice(g.state.hero.level) * n;
  if (g.state.cur.gold < cost) return g.toast('金幣不足', 'warn');
  g.state.cur.gold -= cost;
  g.state.cur.protect += n;
  g.touch();
}

export function buyProtect(g: Game) {
  if (g.state.cur.gems < PROTECT_GEMS) return g.toast('寶石不足', 'warn');
  g.state.cur.gems -= PROTECT_GEMS;
  g.state.cur.protect++;
  g.touch();
}

export function buyBlessing(g: Game, id: string) {
  const b = BLESSING_MAP.get(id);
  if (!b) return;
  if (g.state.cur.gems < b.gems) return g.toast('寶石不足', 'warn');
  g.state.cur.gems -= b.gems;
  const now = g.now();
  const existing = g.state.buffs.find(x => x.id === id);
  if (existing && existing.until > now) existing.until += b.minutes * 60_000;
  else {
    g.state.buffs = g.state.buffs.filter(x => x.id !== id);
    g.state.buffs.push({ id, until: now + b.minutes * 60_000 });
  }
  g.heroChanged();
  g.toast(`${b.name}生效：${b.desc}`, 'good', b.icon);
}

export function buyInvSlots(g: Game) {
  const s = g.state;
  const cfg = GEM_SHOP.invSlots;
  if (s.invCapacity >= cfg.max) return g.toast('已達上限', 'warn');
  if (s.cur.gems < cfg.gems) return g.toast('寶石不足', 'warn');
  s.cur.gems -= cfg.gems;
  s.invCapacity += cfg.amount;
  g.touch();
}

export function buyDungeonEntry(g: Game, id: string) {
  if (!DUNGEON_MAP.has(id)) return;
  if (g.state.cur.gems < GEM_SHOP.dungeonEntry.gems) return g.toast('寶石不足', 'warn');
  dungeonEntries(g, id);
  g.state.cur.gems -= GEM_SHOP.dungeonEntry.gems;
  g.state.dungeons.bought[id] = (g.state.dungeons.bought[id] ?? 0) + 1;
  g.touch();
}

// ---------------------------------------------------------------------
// 旅行商人：每 4 小時刷新一批高品質裝備
// ---------------------------------------------------------------------
export function merchantPrice(it: Item) {
  return Math.round((300 + it.ilvl * 80) * Math.pow(2.4, it.rarity - 2));
}

export function ensureMerchant(g: Game, force = false) {
  const m = g.state.merchant;
  if (!force && m.refreshAt > g.now() && m.items.length) return;
  const L = g.state.hero.level;
  m.items = [];
  for (let i = 0; i < MERCHANT_SIZE; i++) {
    const rarity = Math.max(2, rollRarity(g.rng, 'chest', 30, 0));
    m.items.push({ ...generateItem(itemCtx(g), { ilvl: L + g.rng.int(0, 3), rarity: rarity as 2 }), isNew: false });
  }
  m.refreshAt = g.now() + MERCHANT_REFRESH_MS;
}

export function refreshMerchant(g: Game) {
  if (g.state.cur.gems < GEM_SHOP.merchantRefresh.gems) return g.toast('寶石不足', 'warn');
  g.state.cur.gems -= GEM_SHOP.merchantRefresh.gems;
  ensureMerchant(g, true);
  g.touch();
}

export function buyMerchant(g: Game, uid: number) {
  const m = g.state.merchant;
  const it = m.items.find(i => i.uid === uid);
  if (!it) return;
  const price = merchantPrice(it);
  if (g.state.cur.gold < price) return g.toast('金幣不足', 'warn');
  g.state.cur.gold -= price;
  m.items.splice(m.items.indexOf(it), 1);
  receiveItem(g, { ...it, isNew: true });
  g.toast(`購買了 ${it.name}`, 'good', '🛒');
}
