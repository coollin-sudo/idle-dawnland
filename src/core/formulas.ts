/** 遊戲的所有成長曲線集中在這裡，平衡模擬調整時只動這個檔案。 */

export const MAX_LEVEL = 120;
export const STAT_POINTS_PER_LEVEL = 5;
export const SKILL_POINTS_PER_LEVEL = 1;
export const TALENT_POINT_EVERY = 3;
export const ADVANCE_LEVEL = 30;
export const REBIRTH_REGION = 5; // 通關第 5 區（索引 4）後可轉生

export const xpToNext = (lv: number) => Math.round(45 * Math.pow(lv, 2.15) * Math.pow(1.028, lv) * Math.pow(1.05, Math.max(0, lv - 15)));

// ---------- 怪物 ----------
export const mobHp = (lv: number) => (25 + 10 * Math.pow(lv, 1.6)) * Math.pow(1.012, lv);
export const mobAtk = (lv: number) => (5 + 2.6 * lv + 0.035 * lv * lv) * Math.pow(1.006, lv);
export const mobMatk = (lv: number) => (5 + 2.6 * lv + 0.035 * lv * lv) * Math.pow(1.006, lv);
export const mobDef = (lv: number) => 4 + 2.6 * lv;
export const mobRes = (lv: number) => 3 + 2 * lv;
export const mobEva = (lv: number) => 2 + 1.2 * lv;
export const mobXp = (lv: number) => 6 + 3.2 * Math.pow(lv, 1.42);
export const mobGold = (lv: number) => 3 + 1.4 * lv + 0.12 * Math.pow(lv, 1.6);

// ---------- 減傷 ----------
export const armorDR = (def: number, attackerLvl: number) =>
  Math.min(0.75, Math.max(0, def) / (Math.max(0, def) + 28 * attackerLvl + 120));
export const evadeChance = (eva: number, attackerLvl: number) =>
  Math.min(0.4, Math.max(0, eva) / (Math.max(0, eva) + 30 * attackerLvl + 100));

// ---------- 難度 ----------
export const DIFFICULTIES = [
  { id: 0, name: '普通', lvOffset: 0, mult: 1, dropBonus: 0, color: '#9fd3a0' },
  { id: 1, name: '惡夢', lvOffset: 30, mult: 1.35, dropBonus: 50, color: '#ffb35c' },
  { id: 2, name: '地獄', lvOffset: 60, mult: 1.8, dropBonus: 120, color: '#ff5d6c' },
] as const;

export const REGION_COUNT = 8;
export const STAGES_PER_REGION = 10;
export const WAVES_PER_STAGE = 5;
export const BOSS_TIME_MS = 60_000;

/** stageIndex：0..79（區域 × 10 + 關卡） */
export const stageLevel = (difficulty: number, stageIndex: number) =>
  stageIndex + 1 + DIFFICULTIES[difficulty].lvOffset;

// ---------- 裝備 ----------
export const weaponPower = (ilvl: number) => 6 + 3.4 * ilvl + 0.012 * ilvl * ilvl;
export const armorPower = (ilvl: number) => 4 + 2.1 * ilvl;
export const enhanceMult = (enh: number) => 1 + 0.07 * enh + (enh >= 10 ? 0.1 : 0) + (enh >= 15 ? 0.2 : 0) + (enh >= 20 ? 0.4 : 0);
export const sellPrice = (ilvl: number, rarity: number) => Math.round((5 + ilvl * 2) * Math.pow(2.2, rarity));

// ---------- 經濟 ----------
export const potionHeal = (tier: number) => [0.25, 0.4, 0.6][tier];
export const potionPrice = (tier: number, heroLvl: number) => Math.round([10, 40, 150][tier] * (1 + heroLvl / 15));
export const stonePrice = (heroLvl: number) => Math.round(80 + heroLvl * 6);
