import { flat, inc, type Mod } from '@/core/stats';
import type { ItemSlotKind, Rarity } from '@/core/types';

/** 魔晶：鑲在裝備孔裡的屬性寶石，5 個等級，3 顆同級可合成高一級 */
export interface JewelDef {
  id: string;
  name: string;
  color: string;
  /** 攻擊系鑲在武器、防禦系鑲在頭盔／護甲時效果 ×1.5（參考 Diablo IV 寶石依部位給不同效果） */
  kind: 'offense' | 'defense';
  /** 依等級（0–4）給的加成 */
  mods: (tier: number) => Mod[];
  desc: string;
}

const V = (arr: number[]) => (t: number) => arr[Math.max(0, Math.min(4, t))];

export const JEWELS: JewelDef[] = [
  { id: 'ruby', kind: 'offense', name: '赤焰晶', color: '#ff5a5a', desc: '全傷害', mods: t => [flat('dmg', V([2, 4, 7, 11, 16])(t))] },
  { id: 'sapphire', kind: 'defense', name: '蒼海晶', color: '#4a8aff', desc: '生命', mods: t => [inc('hp', V([3, 6, 10, 15, 22])(t))] },
  { id: 'emerald', kind: 'offense', name: '翠風晶', color: '#4ad86a', desc: '暴擊率', mods: t => [flat('crit', V([1, 2, 3.5, 5, 7])(t))] },
  { id: 'topaz', kind: 'offense', name: '金雷晶', color: '#ffd34a', desc: '攻擊速度', mods: t => [flat('haste', V([2, 4, 6, 9, 13])(t))] },
  { id: 'amethyst', kind: 'offense', name: '紫影晶', color: '#b67bff', desc: '技能傷害', mods: t => [flat('skillDmg', V([3, 6, 10, 15, 22])(t))] },
  {
    id: 'diamond', kind: 'defense', name: '白輝晶', color: '#e8f4ff', desc: '全元素抗性',
    mods: t => (['fireRes', 'iceRes', 'lightningRes', 'holyRes', 'shadowRes'] as const).map(k => flat(k, V([3, 6, 10, 15, 20])(t))),
  },
];
export const JEWEL_MAP = new Map(JEWELS.map(j => [j.id, j]));
export const JEWEL_TIERS = ['碎裂', '普通', '精緻', '無瑕', '皇家'];
export const JEWEL_MAX_TIER = JEWEL_TIERS.length - 1;

export const jewelKey = (id: string, tier: number) => `${id}:${tier}`;
export function parseJewel(key: string): { def: JewelDef; tier: number } | null {
  const [id, t] = key.split(':');
  const def = JEWEL_MAP.get(id);
  const tier = Number(t);
  return def && tier >= 0 && tier <= JEWEL_MAX_TIER ? { def, tier } : null;
}
export const jewelName = (key: string) => {
  const p = parseJewel(key);
  return p ? `${JEWEL_TIERS[p.tier]}${p.def.name}` : '？？？';
};
/** 部位加成：攻擊系魔晶在武器、防禦系魔晶在頭盔或護甲時 ×1.5 */
export const JEWEL_SLOT_BONUS = 1.5;
export function jewelSlotMult(key: string, slot?: ItemSlotKind): number {
  const p = parseJewel(key);
  if (!p || !slot) return 1;
  if (p.def.kind === 'offense' && slot === 'weapon') return JEWEL_SLOT_BONUS;
  if (p.def.kind === 'defense' && (slot === 'armor' || slot === 'helmet')) return JEWEL_SLOT_BONUS;
  return 1;
}
export const jewelMods = (key: string, slot?: ItemSlotKind): Mod[] => {
  const p = parseJewel(key);
  if (!p) return [];
  const m = jewelSlotMult(key, slot);
  return p.def.mods(p.tier).map(x => (m === 1 ? x : { ...x, value: Math.round(x.value * m * 10) / 10 }));
};

/**
 * 鑲嵌孔（參考 Diablo III／IV）：
 * - 部位決定「最多幾孔」：護甲 3、武器 2，其他部位 1（身體越大的部位孔越多）。
 * - 稀有度決定「保底幾孔」與「可以打到幾孔」：越稀有的裝備孔越多，傳說以上直接開好。
 */
export const SLOT_SOCKET_CAP: Record<ItemSlotKind, number> = {
  weapon: 2, offhand: 1, helmet: 1, armor: 3, gloves: 1, belt: 1, boots: 1, amulet: 1, ring: 1,
};
/** 各稀有度掉落時保底的孔數：普通、優良、稀有、史詩、傳說、神話 */
export const RARITY_BASE_SOCKETS: Record<Rarity, number> = { 0: 0, 1: 0, 2: 1, 3: 1, 4: 2, 5: 3 };
/** 各稀有度最多能打到的孔數 */
export const RARITY_MAX_SOCKETS: Record<Rarity, number> = { 0: 0, 1: 1, 2: 2, 3: 2, 4: 3, 5: 3 };
/** 掉落時額外多 1 孔的機率（不超過上限） */
export const BONUS_SOCKET_CHANCE = 0.3;

export const maxSockets = (slot: ItemSlotKind, rarity: Rarity) => Math.min(SLOT_SOCKET_CAP[slot], RARITY_MAX_SOCKETS[rarity]);
export const baseSockets = (slot: ItemSlotKind, rarity: Rarity) => Math.min(SLOT_SOCKET_CAP[slot], RARITY_BASE_SOCKETS[rarity]);

/** 合成 3 顆的金幣費用（依原等級） */
export const combineCost = (tier: number) => Math.round(500 * Math.pow(4, tier));
/** 打孔費用（依目前孔數） */
export const punchCost = (n: number, ilvl: number) => ({ gold: Math.round((2000 + ilvl * 120) * Math.pow(3, n)), stones: 5 * (n + 1) });
/** 取下魔晶的金幣費用 */
export const unsocketCost = (tier: number) => Math.round(200 * Math.pow(3, tier));

/** 新掉落裝備的鑲嵌孔數：保底孔數，30% 機率多 1 孔（r 為 0–1 的亂數） */
export function rollSockets(slot: ItemSlotKind, rarity: Rarity, r: number): (string | null)[] | undefined {
  const base = baseSockets(slot, rarity);
  const n = Math.min(maxSockets(slot, rarity), base + (r < BONUS_SOCKET_CHANCE ? 1 : 0));
  return n ? Array.from({ length: n }, () => null) : undefined;
}
