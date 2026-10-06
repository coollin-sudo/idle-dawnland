import { flat, type Mod } from '@/core/stats';

export interface BlessingDef {
  id: string;
  name: string;
  icon: string;
  mods: Mod[];
  gems: number;
  minutes: number;
  desc: string;
}

export const BLESSINGS: BlessingDef[] = [
  { id: 'b_xp', name: '智慧祝福', icon: '📘', mods: [flat('xpGain', 50)], gems: 30, minutes: 30, desc: '經驗獲得 +50%' },
  { id: 'b_gold', name: '財富祝福', icon: '💰', mods: [flat('goldFind', 60)], gems: 25, minutes: 30, desc: '金幣獲得 +60%' },
  { id: 'b_luck', name: '幸運祝福', icon: '🍀', mods: [flat('magicFind', 50)], gems: 35, minutes: 30, desc: '掉寶率 +50%' },
  { id: 'b_war', name: '戰神祝福', icon: '⚔️', mods: [flat('dmg', 25), flat('dmgTaken', -10)], gems: 40, minutes: 30, desc: '全傷害 +25%、受到傷害 −10%' },
];
export const BLESSING_MAP = new Map(BLESSINGS.map(b => [b.id, b]));

export const GEM_SHOP = {
  invSlots: { gems: 50, amount: 10, max: 150 },
  dungeonEntry: { gems: 20 },
  eggs: [{ tier: 0 as const, gems: 30 }, { tier: 1 as const, gems: 120 }, { tier: 2 as const, gems: 400 }],
  petSlot: { gems: 150, max: 4 },
  merchantRefresh: { gems: 10 },
};

export const MERCHANT_REFRESH_MS = 4 * 3600 * 1000;
export const MERCHANT_SIZE = 6;
