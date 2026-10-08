import { flat, inc, type Mod } from '@/core/stats';
import type { Rarity } from '@/core/types';

/** 魔晶：鑲在裝備孔裡的屬性寶石，5 個等級，3 顆同級可合成高一級 */
export interface JewelDef {
  id: string;
  name: string;
  color: string;
  /** 依等級（0–4）給的加成 */
  mods: (tier: number) => Mod[];
  desc: string;
}

const V = (arr: number[]) => (t: number) => arr[Math.max(0, Math.min(4, t))];

export const JEWELS: JewelDef[] = [
  { id: 'ruby', name: '赤焰晶', color: '#ff5a5a', desc: '全傷害', mods: t => [flat('dmg', V([2, 4, 7, 11, 16])(t))] },
  { id: 'sapphire', name: '蒼海晶', color: '#4a8aff', desc: '生命', mods: t => [inc('hp', V([3, 6, 10, 15, 22])(t))] },
  { id: 'emerald', name: '翠風晶', color: '#4ad86a', desc: '暴擊率', mods: t => [flat('crit', V([1, 2, 3.5, 5, 7])(t))] },
  { id: 'topaz', name: '金雷晶', color: '#ffd34a', desc: '攻擊速度', mods: t => [flat('haste', V([2, 4, 6, 9, 13])(t))] },
  { id: 'amethyst', name: '紫影晶', color: '#b67bff', desc: '技能傷害', mods: t => [flat('skillDmg', V([3, 6, 10, 15, 22])(t))] },
  {
    id: 'diamond', name: '白輝晶', color: '#e8f4ff', desc: '全元素抗性',
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
export const jewelMods = (key: string): Mod[] => {
  const p = parseJewel(key);
  return p ? p.def.mods(p.tier) : [];
};

/** 各稀有度的鑲嵌孔上限：普通、優良、稀有、史詩、傳說、神話 */
export const MAX_SOCKETS: Record<Rarity, number> = { 0: 0, 1: 1, 2: 1, 3: 2, 4: 2, 5: 3 };
/** 合成 3 顆的金幣費用（依原等級） */
export const combineCost = (tier: number) => Math.round(500 * Math.pow(4, tier));
/** 打孔費用（依目前孔數） */
export const punchCost = (n: number, ilvl: number) => ({ gold: Math.round((2000 + ilvl * 120) * Math.pow(3, n)), stones: 5 * (n + 1) });
/** 取下魔晶的金幣費用 */
export const unsocketCost = (tier: number) => Math.round(200 * Math.pow(3, tier));

/** 新掉落裝備的鑲嵌孔數：0 到稀有度上限之間隨機（r 為 0–1 的亂數） */
export function rollSockets(rarity: Rarity, r: number): (string | null)[] | undefined {
  const max = MAX_SOCKETS[rarity];
  if (!max) return undefined;
  const n = Math.floor(r * (max + 1));
  return n ? Array.from({ length: n }, () => null) : undefined;
}
