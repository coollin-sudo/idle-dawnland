/** 遊戲的所有成長曲線集中在這裡，平衡模擬調整時只動這個檔案。 */

export const MAX_LEVEL = 120;
export const STAT_POINTS_PER_LEVEL = 5;
export const SKILL_POINTS_PER_LEVEL = 1;
export const TALENT_POINT_EVERY = 3;
export const ADVANCE_LEVEL = 30;
export const REBIRTH_REGION = 5; // 通關第 5 區（索引 4）後可轉生

/** 原本的快速升級曲線（轉生後回到最高等級前使用） */
export const xpToNextFast = (lv: number) => Math.round(45 * Math.pow(lv, 2.15) * Math.pow(1.028, lv) * Math.pow(1.05, Math.max(0, lv - 15)));

/**
 * 升級減速倍率：第 1～2 區（Lv 1～18）照原本速度，幾小時內就能打到首領；
 * 之後每區（10 級）約掛機一週才會打到該區首領，留時間在週末研究首領機制。
 * 控制點由 balance-sim 量測各等級的實際升級時間校準（目標：Lv27 約 7 天，之後每級約 17 小時），控制點之間以對數內插。
 */
const XP_SLOW: [number, number][] = [
  [16, 1], [17, 38], [18, 80], [19, 125], [20, 200], [21, 260], [23, 225], [25, 190], [26, 145], [28, 78], [35, 55], [37, 31], [47, 21], [49, 12], [56, 8],
  [58, 4.5], [65, 3.5], [67, 1.9], [79, 1.4], [90, 1], [120, 1],
];
export function xpSlow(lv: number): number {
  if (lv <= XP_SLOW[0][0]) return 1;
  for (let i = 1; i < XP_SLOW.length; i++) {
    const [l1, v1] = XP_SLOW[i];
    if (lv <= l1) {
      const [l0, v0] = XP_SLOW[i - 1];
      return Math.exp(Math.log(v0) + (Math.log(v1) - Math.log(v0)) * (lv - l0) / (l1 - l0));
    }
  }
  return XP_SLOW[XP_SLOW.length - 1][1];
}

export const xpToNext = (lv: number) => Math.round(xpToNextFast(lv) * xpSlow(lv));

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
/** 保護卷軸的金幣價格（金幣的長期消耗：強化到 +20 需要大量保護卷軸） */
export const protectGoldPrice = (heroLvl: number) => Math.round(3000 + heroLvl * heroLvl * 12);
/** 精工打造（只花金幣）：價格隨等級平方成長，跟上金幣收入 */
export const fineCraftPrice = (heroLvl: number) => Math.round(4000 + heroLvl * heroLvl * 20);
