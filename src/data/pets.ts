import { flat, inc } from '@/core/stats';
import type { PetDef } from '@/core/types';

export const PETS: PetDef[] = [
  { id: 'pet_slime', name: '史萊姆寶寶', rarity: 0, archetype: 'slime', palette: ['#8ae8ff', '#4ab0d8', '#1a3a4a'], element: 'phys', interval: 2, mult: 0.25, passive: flat('goldFind', 6), desc: '黏在你腳邊不肯走的小史萊姆。' },
  { id: 'pet_fox', name: '小火狐', rarity: 1, archetype: 'beast', palette: ['#ff8a3a', '#fff0e0', '#3a1a0a'], features: ['ears', 'tail', 'small'], element: 'fire', interval: 1.8, mult: 0.32, passive: flat('fireDmg', 8), desc: '尾巴尖端會冒出小火苗。' },
  { id: 'pet_snowbun', name: '雪球兔', rarity: 1, archetype: 'beast', palette: ['#f4f8ff', '#b8d8f0', '#4a8ad8'], features: ['ears', 'small'], element: 'ice', interval: 1.8, mult: 0.32, passive: flat('iceDmg', 8), desc: '冬天會變得更圓。' },
  { id: 'pet_volt', name: '雷電鼠', rarity: 1, archetype: 'beast', palette: ['#ffe35c', '#ff9a3a', '#3a2a0a'], features: ['ears', 'tail', 'small'], element: 'lightning', interval: 1.4, mult: 0.26, passive: flat('haste', 4), desc: '摸牠會被電得頭髮豎起來。' },
  { id: 'pet_sprite', name: '森林小精靈', rarity: 1, archetype: 'spirit', palette: ['#b8ffb0', '#5ad88a', '#ffffff'], element: 'holy', interval: 2, mult: 0.28, passive: flat('healPower', 10), desc: '會在你受傷時哼歌。' },
  { id: 'pet_goblin', name: '迷你哥布林', rarity: 1, archetype: 'humanoid', palette: ['#8ac85a', '#8a5a2a', '#ffe35c'], features: ['ears', 'sack'], element: 'phys', interval: 1.8, mult: 0.3, passive: flat('magicFind', 8), desc: '對亮晶晶的東西特別敏銳。' },
  { id: 'pet_beetle', name: '寶石甲蟲', rarity: 2, archetype: 'insect', palette: ['#3ad8b0', '#1a6a8a', '#f0f8ff'], features: ['small'], element: 'phys', interval: 2.2, mult: 0.4, passive: inc('def', 10), desc: '殼比鋼鐵還硬。' },
  { id: 'pet_lantern', name: '幽靈燈籠', rarity: 2, archetype: 'spirit', palette: ['#c8a8ff', '#7a4ad8', '#ffe35c'], element: 'shadow', interval: 1.8, mult: 0.42, passive: flat('shadowDmg', 12), desc: '照亮夜路，也照亮了亡魂。' },
  { id: 'pet_golem', name: '迷你魔像', rarity: 2, archetype: 'golem', palette: ['#a8a090', '#6a6458', '#4ad8ff'], features: ['small', 'crystals'], element: 'phys', interval: 2.4, mult: 0.45, passive: inc('hp', 10), desc: '走路很慢，但很可靠。' },
  { id: 'pet_griffin', name: '晨曦獅鷲', rarity: 3, archetype: 'bird', palette: ['#f0d080', '#fff8e0', '#d8a03a'], features: ['wings', 'crest'], element: 'holy', interval: 1.6, mult: 0.55, passive: flat('xpGain', 12), desc: '騎士團的守護聖獸。' },
  { id: 'pet_icedrake', name: '小冰龍', rarity: 3, archetype: 'dragon', palette: ['#8ad8ff', '#e0f8ff', '#3a8ad8'], features: ['wings', 'small'], element: 'ice', interval: 1.7, mult: 0.6, passive: flat('critDmg', 18), desc: '斯卡迪留下的龍蛋孵出的孩子。' },
  { id: 'pet_shadowdrake', name: '暮影幼龍', rarity: 4, archetype: 'dragon', palette: ['#4a2a6a', '#b67bff', '#ff4a8a'], features: ['wings', 'horns', 'small'], element: 'shadow', interval: 1.5, mult: 0.75, passive: flat('dmg', 12), desc: '暮影之力被淨化後誕生的幼龍。' },
];
export const PET_MAP = new Map(PETS.map(p => [p.id, p]));

export const EGGS = [
  { tier: 0 as const, name: '普通寵物蛋', hatchMs: 10 * 60_000, weights: [60, 35, 5, 0, 0], color: '#e8dcc0' },
  { tier: 1 as const, name: '稀有寵物蛋', hatchMs: 60 * 60_000, weights: [10, 55, 30, 5, 0], color: '#7ab8ff' },
  { tier: 2 as const, name: '傳說寵物蛋', hatchMs: 4 * 60 * 60_000, weights: [0, 15, 45, 32, 8], color: '#ffa53a' },
];

export const petXpToNext = (lv: number) => Math.round(20 * Math.pow(lv, 1.6));
export const PET_MAX_LEVEL = 60;
export const PET_MAX_STARS = 5;
export const petStarCost = (stars: number) => [1, 2, 3, 5, 8][stars] ?? 99;
/** 寵物被動加成倍率：等級與星級 */
export const petPassiveMult = (level: number, stars: number) => (1 + level * 0.02) * (1 + stars * 0.4);
