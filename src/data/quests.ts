import type { Rarity } from '@/core/types';

export type QuestType =
  | 'stage' | 'level' | 'kill' | 'enhance' | 'equipRarity' | 'skill' | 'talent' | 'advance'
  | 'pets' | 'dungeon' | 'tower' | 'salvage' | 'diffStage' | 'rebirth';

export interface QuestReward {
  gold?: number;
  gems?: number;
  stones?: number;
  petFood?: number;
  item?: { rarity: Rarity };
  egg?: 0 | 1 | 2;
  protect?: number;
}

export interface QuestDef {
  id: string;
  chapter: number;
  name: string;
  type: QuestType;
  value: number;
  target?: string;
  difficulty?: number;
  reward: QuestReward;
  /** 任務開始時播放的劇情 */
  before?: string;
  /** 任務完成時播放的劇情 */
  after?: string;
}

export const CHAPTERS = ['晨露草原', '迷霧森林', '遺忘礦坑', '赤沙遺跡', '霜語山脈', '熔心火山', '雷鳴天城', '暮影深淵', '暮影之源'];

const Q = (d: QuestDef) => d;

export const MAIN_QUESTS: QuestDef[] = [
  // 第一章
  Q({ id: 'q1_1', chapter: 0, name: '通關 1-3', type: 'stage', value: 2, reward: { gold: 150, stones: 2 }, before: 'prologue' }),
  Q({ id: 'q1_2', chapter: 0, name: '擊敗 15 隻露珠史萊姆', type: 'kill', target: 'slime', value: 15, reward: { gold: 200 } }),
  Q({ id: 'q1_3', chapter: 0, name: '等級達到 5', type: 'level', value: 5, reward: { gems: 20, stones: 3 } }),
  Q({ id: 'q1_4', chapter: 0, name: '裝備一件優良以上的裝備', type: 'equipRarity', value: 1, reward: { gold: 400, stones: 3 }, after: 'forge_intro' }),
  Q({ id: 'q1_5', chapter: 0, name: '擊敗哥布林王 格魯克', type: 'stage', value: 9, reward: { gems: 30, item: { rarity: 2 } }, after: 'ch1_boss' }),
  // 第二章
  Q({ id: 'q2_1', chapter: 1, name: '通關 2-3', type: 'stage', value: 12, reward: { gold: 800 }, before: 'ch2_intro' }),
  Q({ id: 'q2_2', chapter: 1, name: '將任一技能升到 3 級', type: 'skill', value: 3, reward: { gems: 20 } }),
  Q({ id: 'q2_3', chapter: 1, name: '擊敗 30 隻霧影灰狼', type: 'kill', target: 'wolf', value: 30, reward: { stones: 6 } }),
  Q({ id: 'q2_4', chapter: 1, name: '將任一裝備強化到 +3', type: 'enhance', value: 3, reward: { gold: 1500 } }),
  Q({ id: 'q2_5', chapter: 1, name: '擊敗腐化樹人 艾爾德', type: 'stage', value: 19, reward: { gems: 40, egg: 0, petFood: 10 }, after: 'ch2_boss' }),
  // 第三章
  Q({ id: 'q3_1', chapter: 2, name: '通關 3-3', type: 'stage', value: 22, reward: { gold: 2500 }, before: 'ch3_intro' }),
  Q({ id: 'q3_2', chapter: 2, name: '投入 3 點天賦', type: 'talent', value: 3, reward: { gems: 20 } }),
  Q({ id: 'q3_3', chapter: 2, name: '完成 1 次每日副本', type: 'dungeon', value: 1, reward: { stones: 10 } }),
  Q({ id: 'q3_4', chapter: 2, name: '分解 15 件裝備', type: 'salvage', value: 15, reward: { gold: 4000 } }),
  Q({ id: 'q3_5', chapter: 2, name: '擊敗深淵巨魔 戈爾', type: 'stage', value: 29, reward: { gems: 50, item: { rarity: 3 } }, after: 'ch3_boss' }),
  // 第四章
  Q({ id: 'q4_1', chapter: 3, name: '無盡之塔到達第 5 層', type: 'tower', value: 5, reward: { gems: 30 }, before: 'ch4_intro' }),
  Q({ id: 'q4_2', chapter: 3, name: '等級達到 30', type: 'level', value: 30, reward: { gold: 8000 } }),
  Q({ id: 'q4_3', chapter: 3, name: '完成轉職', type: 'advance', value: 1, reward: { gems: 50, stones: 15 } }),
  Q({ id: 'q4_4', chapter: 3, name: '擊敗法老亡魂 塞特', type: 'stage', value: 39, reward: { gems: 60, egg: 1 } }),
  // 第五章
  Q({ id: 'q5_1', chapter: 4, name: '通關 5-5', type: 'stage', value: 44, reward: { gold: 15000 }, before: 'ch5_intro' }),
  Q({ id: 'q5_2', chapter: 4, name: '擁有 3 種寵物', type: 'pets', value: 3, reward: { petFood: 30 } }),
  Q({ id: 'q5_3', chapter: 4, name: '將任一裝備強化到 +7', type: 'enhance', value: 7, reward: { protect: 2, stones: 20 } }),
  Q({ id: 'q5_4', chapter: 4, name: '擊敗冰霜巨龍 斯卡迪', type: 'stage', value: 49, reward: { gems: 80, item: { rarity: 3 } }, after: 'ch5_boss' }),
  // 第六章
  Q({ id: 'q6_1', chapter: 5, name: '等級達到 55', type: 'level', value: 55, reward: { gold: 40000 }, before: 'ch6_intro' }),
  Q({ id: 'q6_2', chapter: 5, name: '裝備一件史詩以上的裝備', type: 'equipRarity', value: 3, reward: { gems: 40 } }),
  Q({ id: 'q6_3', chapter: 5, name: '無盡之塔到達第 20 層', type: 'tower', value: 20, reward: { gems: 60, protect: 2 } }),
  Q({ id: 'q6_4', chapter: 5, name: '擊敗炎魔 巴爾洛斯', type: 'stage', value: 59, reward: { gems: 100, egg: 1 } }),
  // 第七章
  Q({ id: 'q7_1', chapter: 6, name: '通關 7-5', type: 'stage', value: 64, reward: { gold: 80000 }, before: 'ch7_intro' }),
  Q({ id: 'q7_2', chapter: 6, name: '將任一技能升到 8 級', type: 'skill', value: 8, reward: { gems: 50 } }),
  Q({ id: 'q7_3', chapter: 6, name: '擊敗風暴君王 托爾納', type: 'stage', value: 69, reward: { gems: 120, item: { rarity: 4 } } }),
  // 第八章
  Q({ id: 'q8_1', chapter: 7, name: '等級達到 75', type: 'level', value: 75, reward: { gold: 150000 }, before: 'ch8_intro' }),
  Q({ id: 'q8_2', chapter: 7, name: '裝備一件傳說以上的裝備', type: 'equipRarity', value: 4, reward: { gems: 80 } }),
  Q({ id: 'q8_3', chapter: 7, name: '擊敗暮影之主 諾克斯', type: 'stage', value: 79, reward: { gems: 300, egg: 2 }, after: 'ending' }),
  // 終章
  Q({ id: 'q9_1', chapter: 8, name: '惡夢難度通關第 5 區', type: 'diffStage', difficulty: 1, value: 49, reward: { gems: 150 } }),
  Q({ id: 'q9_2', chapter: 8, name: '無盡之塔到達第 50 層', type: 'tower', value: 50, reward: { gems: 200, egg: 2 } }),
  Q({ id: 'q9_3', chapter: 8, name: '完成 1 次轉生', type: 'rebirth', value: 1, reward: { gems: 150 } }),
  Q({ id: 'q9_4', chapter: 8, name: '惡夢難度擊敗諾克斯', type: 'diffStage', difficulty: 1, value: 79, reward: { gems: 400, item: { rarity: 5 } }, after: 'nightmare_end' }),
  Q({ id: 'q9_5', chapter: 8, name: '地獄難度擊敗諾克斯', type: 'diffStage', difficulty: 2, value: 79, reward: { gems: 1000, item: { rarity: 5 } }, after: 'hell_end' }),
];

/** 功能解鎖條件（普通難度最高關卡） */
export const UNLOCKS = {
  dungeon: 19,
  tower: 29,
  pets: 19,
  rebirth: 49,
  merchant: 29,
};
