import { flat, inc, type Mod } from '@/core/stats';

export interface EliteAffix {
  id: string;
  name: string;
  color: string;
  mods: Mod[];
  /** 進入戰鬥時的特殊設定 */
  setup?: 'shield' | 'burn' | 'chill' | 'thorns' | 'vamp';
  minLevel: number;
}

export const ELITE_AFFIXES: EliteAffix[] = [
  { id: 'tough', name: '堅韌', color: '#c8a87a', mods: [inc('hp', 80), inc('def', 30)], minLevel: 1 },
  { id: 'frenzy', name: '狂暴', color: '#ff6a4a', mods: [flat('haste', 45)], minLevel: 5 },
  { id: 'swift', name: '迅捷', color: '#8affc8', mods: [inc('eva', 150), flat('haste', 20)], minLevel: 8 },
  { id: 'vampiric', name: '吸血', color: '#d8304a', mods: [flat('lifesteal', 20)], setup: 'vamp', minLevel: 12 },
  { id: 'fiery', name: '烈焰', color: '#ff8a3a', mods: [flat('fireRes', 50)], setup: 'burn', minLevel: 15 },
  { id: 'frozen', name: '冰霜', color: '#7fd8ff', mods: [flat('iceRes', 50)], setup: 'chill', minLevel: 20 },
  { id: 'shielded', name: '護盾', color: '#7ab8ff', mods: [], setup: 'shield', minLevel: 25 },
  { id: 'thorny', name: '反射', color: '#b8a8ff', mods: [], setup: 'thorns', minLevel: 30 },
  { id: 'mighty', name: '強力', color: '#ffd04a', mods: [inc('atk', 40), inc('matk', 40)], minLevel: 35 },
];

export const ELITE_MAP = new Map(ELITE_AFFIXES.map(e => [e.id, e]));
export const ELITE_HP = 3.2;
export const ELITE_ATK = 1.25;
export const ELITE_REWARD = 4;
