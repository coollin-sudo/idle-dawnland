import { flat, inc, type Mod } from '@/core/stats';

// =====================================================================
// 成就：計數型，每達到一階給永久加成與寶石
// =====================================================================
export interface AchievementDef {
  id: string;
  name: string;
  icon: string;
  counter: string;
  tiers: number[];
  /** 每一階給的加成 */
  reward: Mod;
  desc: (n: number) => string;
}

const T5 = (a: number) => [a, a * 10, a * 100, a * 1000, a * 10000];

export const ACHIEVEMENTS: AchievementDef[] = [
  { id: 'kills', name: '怪物獵人', icon: '⚔️', counter: 'kills', tiers: T5(100), reward: inc('atk', 2), desc: n => `擊殺 ${n} 隻怪物` },
  { id: 'kills_m', name: '魔法獵人', icon: '🔮', counter: 'kills', tiers: T5(150), reward: inc('matk', 2), desc: n => `擊殺 ${n} 隻怪物` },
  { id: 'elites', name: '精英剋星', icon: '💀', counter: 'eliteKills', tiers: [10, 100, 1000, 5000, 20000], reward: flat('eliteDmg', 5), desc: n => `擊殺 ${n} 隻精英怪` },
  { id: 'bosses', name: '首領終結者', icon: '👑', counter: 'bossKills', tiers: [1, 10, 50, 200, 1000], reward: flat('bossDmg', 4), desc: n => `擊敗 ${n} 個首領` },
  { id: 'gold', name: '富可敵國', icon: '💰', counter: 'goldEarned', tiers: [1e4, 1e6, 1e8, 1e10, 1e12], reward: flat('goldFind', 5), desc: n => `累積獲得 ${n.toLocaleString()} 金幣` },
  { id: 'items', name: '收藏家', icon: '🎒', counter: 'itemsFound', tiers: T5(50), reward: flat('magicFind', 4), desc: n => `獲得 ${n} 件裝備` },
  { id: 'legend', name: '傳說的足跡', icon: '🌟', counter: 'legendaries', tiers: [1, 5, 20, 60, 150], reward: flat('dmg', 3), desc: n => `獲得 ${n} 件傳說以上裝備` },
  { id: 'enhance', name: '鍛造大師', icon: '🔨', counter: 'enhanceMax', tiers: [5, 10, 13, 16, 20], reward: inc('def', 5), desc: n => `將裝備強化到 +${n}` },
  { id: 'salvage', name: '拆解專家', icon: '♻️', counter: 'salvaged', tiers: T5(50), reward: flat('goldFind', 4), desc: n => `分解 ${n} 件裝備` },
  { id: 'level', name: '身經百戰', icon: '📈', counter: 'maxLevel', tiers: [10, 30, 60, 90, 120], reward: inc('hp', 4), desc: n => `等級達到 ${n}` },
  { id: 'stages', name: '開拓者', icon: '🗺️', counter: 'stagesCleared', tiers: [10, 30, 50, 80, 160], reward: flat('xpGain', 5), desc: n => `累積通關 ${n} 個關卡` },
  { id: 'dungeon', name: '副本常客', icon: '🏛️', counter: 'dungeonRuns', tiers: [5, 30, 100, 300, 1000], reward: flat('goldFind', 5), desc: n => `完成 ${n} 次每日副本` },
  { id: 'tower', name: '登塔者', icon: '🗼', counter: 'towerBest', tiers: [10, 25, 50, 100, 200], reward: flat('critDmg', 5), desc: n => `無盡之塔到達第 ${n} 層` },
  { id: 'pets', name: '寵物之友', icon: '🐾', counter: 'petsOwned', tiers: [1, 3, 6, 9, 12], reward: flat('petDmg', 10), desc: n => `擁有 ${n} 種寵物` },
  { id: 'crits', name: '致命一擊', icon: '💥', counter: 'crits', tiers: T5(500), reward: flat('crit', 1), desc: n => `打出 ${n} 次暴擊` },
  { id: 'skills', name: '技能大師', icon: '✨', counter: 'skillsCast', tiers: T5(200), reward: flat('cdr', 1), desc: n => `施放 ${n} 次技能` },
  { id: 'rebirth', name: '輪迴', icon: '♾️', counter: 'rebirths', tiers: [1, 3, 10, 25, 50], reward: inc('atk', 5), desc: n => `轉生 ${n} 次` },
  { id: 'rebirth_m', name: '星辰輪迴', icon: '🌌', counter: 'rebirths', tiers: [1, 3, 10, 25, 50], reward: inc('matk', 5), desc: n => `轉生 ${n} 次` },
  { id: 'daily', name: '勤勉', icon: '📅', counter: 'dailiesDone', tiers: [5, 30, 100, 300, 1000], reward: flat('magicFind', 5), desc: n => `完成 ${n} 個每日任務` },
  { id: 'codex', name: '博物學者', icon: '📖', counter: 'codexTiers', tiers: [5, 20, 50, 80, 120], reward: flat('dmg', 2), desc: n => `圖鑑累積 ${n} 個星等` },
];
export const ACHIEVEMENT_GEMS = [10, 20, 40, 80, 150];

// =====================================================================
// 星魂天賦（轉生）
// =====================================================================
export interface StarNode {
  id: string;
  name: string;
  icon: string;
  max: number;
  baseCost: number;
  mods?: (r: number) => Mod[];
  special?: 'offline' | 'startStage' | 'enhance' | 'souls' | 'inventory' | 'autoSkill';
  per?: number;
  desc: (r: number) => string;
}

export const STAR_NODES: StarNode[] = [
  { id: 'st_might', name: '星之力', icon: '⚔️', max: 25, baseCost: 1, mods: r => [inc('atk', 6 * r), inc('matk', 6 * r)], desc: r => `物理與魔法攻擊 +${6 * r}%` },
  { id: 'st_body', name: '星之體', icon: '❤️', max: 25, baseCost: 1, mods: r => [inc('hp', 6 * r), inc('def', 3 * r)], desc: r => `生命 +${6 * r}%、防禦 +${3 * r}%` },
  { id: 'st_wisdom', name: '星之智', icon: '📘', max: 15, baseCost: 2, mods: r => [flat('xpGain', 10 * r)], desc: r => `經驗獲得 +${10 * r}%` },
  { id: 'st_wealth', name: '星之財', icon: '💰', max: 15, baseCost: 2, mods: r => [flat('goldFind', 12 * r)], desc: r => `金幣獲得 +${12 * r}%` },
  { id: 'st_luck', name: '星之運', icon: '🍀', max: 15, baseCost: 2, mods: r => [flat('magicFind', 8 * r)], desc: r => `掉寶率 +${8 * r}%` },
  { id: 'st_speed', name: '星之速', icon: '💨', max: 10, baseCost: 3, mods: r => [flat('haste', 2.5 * r)], desc: r => `攻擊速度 +${2.5 * r}%` },
  { id: 'st_hunt', name: '星之獵', icon: '🎯', max: 10, baseCost: 3, mods: r => [flat('bossDmg', 6 * r), flat('eliteDmg', 6 * r)], desc: r => `對首領與精英傷害 +${6 * r}%` },
  { id: 'st_pet', name: '星之絆', icon: '🐾', max: 10, baseCost: 2, mods: r => [flat('petDmg', 15 * r)], desc: r => `寵物傷害 +${15 * r}%` },
  { id: 'st_time', name: '時光延展', icon: '⏳', max: 8, baseCost: 3, special: 'offline', per: 1, desc: r => `離線收益上限 +${r} 小時` },
  { id: 'st_warp', name: '起點躍遷', icon: '🌀', max: 6, baseCost: 5, special: 'startStage', per: 10, desc: r => `轉生後直接從第 ${r * 10 + 1} 關開始` },
  { id: 'st_forge', name: '鍛造之星', icon: '🔨', max: 5, baseCost: 4, special: 'enhance', per: 1, desc: r => `強化成功率 +${r}%` },
  { id: 'st_soul', name: '星魂共鳴', icon: '🌌', max: 10, baseCost: 4, special: 'souls', per: 10, desc: r => `轉生獲得的星魂 +${10 * r}%` },
  { id: 'st_bag', name: '次元背包', icon: '🎒', max: 5, baseCost: 3, special: 'inventory', per: 10, desc: r => `背包容量 +${10 * r}` },
];
export const starCost = (node: StarNode, rank: number) => Math.round(node.baseCost * (rank + 1) * (1 + rank * 0.15));

// =====================================================================
// 圖鑑
// =====================================================================
export const CODEX_TIERS = [50, 500, 5000];
export const CODEX_BONUS_PER_TIER = 0.4; // 每個星等：全傷害與生命 +0.4%

// =====================================================================
// 每日任務
// =====================================================================
export interface DailyDef {
  id: string;
  name: string;
  counter: string;
  goal: number;
  gems: number;
  gold: number;
}

export const DAILY_POOL: DailyDef[] = [
  { id: 'd_kill', name: '擊殺 400 隻怪物', counter: 'kills', goal: 400, gems: 10, gold: 1 },
  { id: 'd_elite', name: '擊殺 15 隻精英怪', counter: 'eliteKills', goal: 15, gems: 10, gold: 1 },
  { id: 'd_boss', name: '擊敗 2 個首領', counter: 'bossKills', goal: 2, gems: 12, gold: 1 },
  { id: 'd_enh', name: '進行 5 次強化', counter: 'enhanceTries', goal: 5, gems: 8, gold: 1 },
  { id: 'd_salvage', name: '分解 20 件裝備', counter: 'salvaged', goal: 20, gems: 8, gold: 1 },
  { id: 'd_dungeon', name: '完成 2 次每日副本', counter: 'dungeonRuns', goal: 2, gems: 12, gold: 1 },
  { id: 'd_tower', name: '挑戰無盡之塔 3 次', counter: 'towerTries', goal: 3, gems: 10, gold: 1 },
  { id: 'd_skill', name: '施放 150 次技能', counter: 'skillsCast', goal: 150, gems: 8, gold: 1 },
  { id: 'd_crit', name: '打出 300 次暴擊', counter: 'crits', goal: 300, gems: 8, gold: 1 },
  { id: 'd_feed', name: '餵食寵物 3 次', counter: 'petFeeds', goal: 3, gems: 8, gold: 1 },
  { id: 'd_stage', name: '通關 5 個關卡', counter: 'stagesCleared', goal: 5, gems: 10, gold: 1 },
];
export const DAILY_COUNT = 5;
export const DAILY_CHEST_GEMS = 40;
