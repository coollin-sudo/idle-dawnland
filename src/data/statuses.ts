import type { Element, Mod } from '@/core/stats';
import { flat } from '@/core/stats';
import type { StatusId } from '@/core/types';

export interface StatusDef {
  id: StatusId;
  name: string;
  icon: string;
  color: string;
  dur: number;
  maxStacks: number;
  /** 持續傷害：每秒造成「觸發那一擊傷害 × ratio」×層數 */
  dot?: { ratio: number; element: Element };
  /** 每層提供的修正值 */
  mods?: Mod[];
  /** 無法行動 */
  disable?: boolean;
  debuff: true;
}

export const STATUSES: Record<StatusId, StatusDef> = {
  burn: { id: 'burn', name: '燃燒', icon: '🔥', color: '#ff7a3d', dur: 3, maxStacks: 3, dot: { ratio: 0.2, element: 'fire' }, debuff: true },
  chill: { id: 'chill', name: '冰緩', icon: '🧊', color: '#7fd8ff', dur: 3, maxStacks: 3, mods: [flat('haste', -15)], debuff: true },
  freeze: { id: 'freeze', name: '冰凍', icon: '❄️', color: '#bff0ff', dur: 1.5, maxStacks: 1, disable: true, debuff: true },
  shock: { id: 'shock', name: '感電', icon: '⚡', color: '#ffe35c', dur: 4, maxStacks: 1, mods: [flat('dmgTaken', 15)], debuff: true },
  bleed: { id: 'bleed', name: '流血', icon: '🩸', color: '#e0424a', dur: 5, maxStacks: 5, dot: { ratio: 0.12, element: 'phys' }, debuff: true },
  poison: { id: 'poison', name: '中毒', icon: '☠️', color: '#7ad16a', dur: 6, maxStacks: 10, dot: { ratio: 0.08, element: 'shadow' }, debuff: true },
  stun: { id: 'stun', name: '暈眩', icon: '💫', color: '#ffd76a', dur: 1, maxStacks: 1, disable: true, debuff: true },
  weaken: { id: 'weaken', name: '虛弱', icon: '🥀', color: '#a08cc8', dur: 6, maxStacks: 1, mods: [flat('dmg', -25)], debuff: true },
  curse: { id: 'curse', name: '詛咒', icon: '👁️', color: '#b67bff', dur: 10, maxStacks: 1, mods: [flat('dmgTaken', 30)], debuff: true },
};

/** 元素攻擊命中時自帶的異常（基礎 10% 機率，可被異常觸發率提升） */
export const ELEMENT_STATUS: Partial<Record<Element, StatusId>> = {
  fire: 'burn', ice: 'chill', lightning: 'shock', shadow: 'poison',
};
export const ELEMENT_STATUS_CHANCE = 0.1;
