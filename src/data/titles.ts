import { flat, inc, type Mod } from '@/core/stats';
import type { GameState } from '@/core/types';
import { ACHIEVEMENTS } from './meta';

/** 稱號：一次配戴一個，顯示在名字旁並給予小幅加成 */
export interface TitleDef {
  id: string;
  name: string;
  icon: string;
  mod: Mod;
  /** 解鎖條件說明 */
  req: string;
  unlocked: (s: GameState) => boolean;
}

/** 成就達到第 III 階解鎖同名稱號，加成為該成就單階獎勵的 2 倍 */
const ACH_TIER = 3;
const fromAchievements: TitleDef[] = ACHIEVEMENTS.map(a => ({
  id: 'ach:' + a.id,
  name: a.name,
  icon: a.icon,
  mod: { ...a.reward, value: a.reward.value * 2 },
  req: `成就「${a.name}」達到 Ⅲ 階`,
  unlocked: s => (s.achievements[a.id] ?? 0) >= ACH_TIER,
}));

const LAST_STAGE = 79;
const special: TitleDef[] = [
  { id: 'savior', name: '晨曦救世主', icon: '🌟', mod: flat('dmg', 5), req: '在普通難度擊敗暮影之主', unlocked: s => s.progress.best[0] >= LAST_STAGE },
  { id: 'nightmare', name: '夢魘行者', icon: '🌙', mod: flat('dmg', 8), req: '在惡夢難度擊敗暮影之主', unlocked: s => s.progress.best[1] >= LAST_STAGE },
  { id: 'hellwalker', name: '地獄征服者', icon: '🔥', mod: flat('dmg', 12), req: '在地獄難度擊敗暮影之主', unlocked: s => s.progress.best[2] >= LAST_STAGE },
  { id: 'skytower', name: '天塔之巔', icon: '🗼', mod: inc('hp', 8), req: '無盡之塔到達第 50 層', unlocked: s => s.tower.best >= 50 },
  { id: 'reborn', name: '輪迴之人', icon: '♾️', mod: flat('xpGain', 10), req: '完成 1 次轉生', unlocked: s => s.rebirth.count >= 1 },
];

export const TITLES: TitleDef[] = [...special, ...fromAchievements];
export const TITLE_MAP = new Map(TITLES.map(t => [t.id, t]));
