import type { HeroLook } from '@/core/types';

export interface Npc {
  id: string;
  name: string;
  title: string;
  look: HeroLook;
}

export const NPCS: Record<string, Npc> = {
  aria: { id: 'aria', name: '艾莉亞', title: '曙光騎士團隊長', look: { skin: '#f3d0b0', hair: '#f0d070', hairStyle: 'pony', outfit: '#d8dce8', outfit2: '#5a6a8a', trim: '#f0c85a', hat: 'none', weapon: 'sword', offhand: 'shield', cape: '#2f5aa8' } },
  glenn: { id: 'glenn', name: '葛倫', title: '老鐵匠', look: { skin: '#d8a880', hair: '#c8c8c8', hairStyle: 'bald', outfit: '#6a4a30', outfit2: '#3a2a1a', trim: '#b8b8b8', hat: 'none', weapon: 'mace', offhand: 'none' } },
  mila: { id: 'mila', name: '米菈', title: '王立學院學者', look: { skin: '#f5dcc8', hair: '#5a3a8a', hairStyle: 'long', outfit: '#3a6a5a', outfit2: '#1a3a30', trim: '#e0c890', hat: 'none', weapon: 'staff', offhand: 'none' } },
  bobo: { id: 'bobo', name: '波波', title: '寵物商人', look: { skin: '#f0c8a0', hair: '#e88a3a', hairStyle: 'spiky', outfit: '#e8a83a', outfit2: '#8a5a1a', trim: '#5ad88a', hat: 'none', weapon: 'mace', offhand: 'none' } },
  sal: { id: 'sal', name: '薩爾', title: '旅行商人', look: { skin: '#c8906a', hair: '#2a2a2a', hairStyle: 'hood', outfit: '#8a3a5a', outfit2: '#4a1a2a', trim: '#f0c85a', hat: 'hood', weapon: 'staff', offhand: 'none' } },
  nox: { id: 'nox', name: '諾克斯', title: '暮影之主', look: { skin: '#b8a8c8', hair: '#1a1028', hairStyle: 'long', outfit: '#2a1a3a', outfit2: '#0c0614', trim: '#b67bff', hat: 'horned', weapon: 'staff', offhand: 'none', cape: '#4a1a5a' } },
};

export interface StoryLine { who: string; text: string }
export interface Scene { id: string; title: string; lines: StoryLine[] }

const HERO = 'hero';

export const SCENES: Record<string, Scene> = {
  prologue: {
    id: 'prologue', title: '序章・晨曦破碎',
    lines: [
      { who: 'aria', text: '你就是今天報到的新人？歡迎加入曙光騎士團。' },
      { who: 'aria', text: '你應該聽說了——三天前，守護大陸的「永晝水晶」被暮影之主諾克斯擊碎了。' },
      { who: 'aria', text: '八塊碎片散落各地，被碎片汙染的生物開始襲擊村莊。' },
      { who: HERO, text: '我能做什麼？' },
      { who: 'aria', text: '先從晨露草原開始。那裡的哥布林撿到了一塊碎片，越來越囂張了。' },
      { who: 'aria', text: '戰鬥會自動進行，你只要做好準備：換上好裝備、學會技能。去吧！' },
    ],
  },
  forge_intro: {
    id: 'forge_intro', title: '老鐵匠',
    lines: [
      { who: 'glenn', text: '喔？騎士團的新面孔。看你那身破銅爛鐵，打不了多久的。' },
      { who: 'glenn', text: '把用不到的裝備拿來給我分解，換成強化石和精華。' },
      { who: 'glenn', text: '強化到 +5 之前都很安全。再往上……就看你的運氣了，哈哈！' },
    ],
  },
  ch1_boss: {
    id: 'ch1_boss', title: '第一塊碎片',
    lines: [
      { who: 'aria', text: '幹得好！這是第一塊永晝水晶碎片。' },
      { who: 'aria', text: '碎片在發光……它好像在指引下一塊的方向。迷霧森林。' },
      { who: 'aria', text: '森林裡的霧不太對勁，小心點。' },
    ],
  },
  ch2_intro: {
    id: 'ch2_intro', title: '第二章・迷霧森林',
    lines: [
      { who: 'mila', text: '你是騎士團的人吧？我是王立學院的米菈，正在研究被汙染的生物。' },
      { who: 'mila', text: '每種怪物打倒得夠多，我就能在圖鑑裡分析出牠們的弱點，讓你的攻擊更有效。' },
      { who: 'mila', text: '森林守護者艾爾德被腐化了……如果你能讓他解脫，也算是救了他。' },
    ],
  },
  ch2_boss: {
    id: 'ch2_boss', title: '寵物商人',
    lines: [
      { who: 'bobo', text: '哇！你打倒了那棵大樹？樹根底下有一顆蛋耶！' },
      { who: 'bobo', text: '我是波波，專門照顧小動物。把蛋交給我孵，孵出來的寵物會跟著你戰鬥喔。' },
      { who: 'bobo', text: '首領偶爾也會掉蛋，多收集幾隻吧！' },
    ],
  },
  ch3_intro: {
    id: 'ch3_intro', title: '第三章・遺忘礦坑',
    lines: [
      { who: 'aria', text: '下一塊碎片在遺忘礦坑的深處。' },
      { who: 'aria', text: '對了，騎士團開放了「每日副本」給你。黃金洞窟、精煉礦脈、試煉神殿，每天都去一趟吧。' },
      { who: 'glenn', text: '礦坑裡全是好礦石。帶點強化石回來給老頭子。' },
    ],
  },
  ch3_boss: {
    id: 'ch3_boss', title: '無盡之塔',
    lines: [
      { who: 'aria', text: '巨魔倒下了，碎片到手。你成長得真快。' },
      { who: 'aria', text: '王都郊外有一座「無盡之塔」，據說每一層都有強大的守衛。有空去挑戰看看，能拿到寶石和套裝。' },
    ],
  },
  ch4_intro: {
    id: 'ch4_intro', title: '第四章・赤沙遺跡',
    lines: [
      { who: 'sal', text: '嘿，騎士。要不要看看薩爾的貨？大陸各地的好東西，我這裡都有。' },
      { who: 'mila', text: '遺跡裡沉睡著古代法老。碎片的力量把他喚醒了……神聖的力量對不死生物特別有效。' },
      { who: 'aria', text: '等你到了 30 級，回來找我。是時候選擇你真正的道路了——轉職。' },
    ],
  },
  advance: {
    id: 'advance', title: '轉職',
    lines: [
      { who: 'aria', text: '你已經準備好了。每一位守護者，最終都要選擇自己的道路。' },
      { who: 'aria', text: '兩條路沒有好壞之分，只有適不適合你。選擇之後，新的技能就會覺醒。' },
    ],
  },
  ch5_intro: {
    id: 'ch5_intro', title: '第五章・霜語山脈',
    lines: [
      { who: 'mila', text: '山頂沉睡著古龍斯卡迪。龍族不會輕易被汙染……那塊碎片的力量一定很強。' },
      { who: 'aria', text: '帶好抗寒的裝備。冰凍會讓你無法行動，非常危險。' },
    ],
  },
  ch5_boss: {
    id: 'ch5_boss', title: '星辰的輪迴',
    lines: [
      { who: 'mila', text: '你注意到了嗎？碎片會吸收你戰鬥的經驗……還會凝結出「星魂」。' },
      { who: 'mila', text: '古籍記載，守護者可以「轉生」：放棄現在的等級與進度，換取星魂，讓靈魂本身變強。' },
      { who: 'mila', text: '裝備和寵物都會留著。當你覺得前進變慢的時候，就考慮看看吧。' },
    ],
  },
  ch6_intro: {
    id: 'ch6_intro', title: '第六章・熔心火山',
    lines: [
      { who: 'aria', text: '火山被炎魔點燃，附近的村莊都快被岩漿吞沒了。' },
      { who: 'glenn', text: '火山的熱度能鍛出最好的鋼。小子，該把你的裝備強化到更高了。' },
    ],
  },
  ch7_intro: {
    id: 'ch7_intro', title: '第七章・雷鳴天城',
    lines: [
      { who: 'mila', text: '雲端之上的古代王國……傳說他們的機械守衛到現在都還在運作。' },
      { who: 'aria', text: '只剩兩塊碎片了。諾克斯一定察覺到我們了。' },
    ],
  },
  ch8_intro: {
    id: 'ch8_intro', title: '第八章・暮影深淵',
    lines: [
      { who: 'nox', text: '……愚蠢的守護者。你以為收集碎片就能讓晨曦回來？' },
      { who: 'nox', text: '黃昏才是這片大陸真正的樣子。來吧，到深淵來，讓我看看你的光有多微弱。' },
      { who: 'aria', text: '別聽他的。最後一塊碎片就在深淵底部——我們一起結束這一切。' },
    ],
  },
  ending: {
    id: 'ending', title: '晨曦再臨',
    lines: [
      { who: 'nox', text: '不可能……這道光……' },
      { who: 'aria', text: '八塊碎片都回來了！永晝水晶正在重生……' },
      { who: 'mila', text: '可是我感覺到深淵還在擴張……諾克斯只是暮影的一部分。' },
      { who: 'aria', text: '騎士團解鎖了「惡夢難度」。更強的敵人，也有更好的寶物。守護者，旅程還沒結束。' },
    ],
  },
  nightmare_end: {
    id: 'nightmare_end', title: '惡夢的盡頭',
    lines: [
      { who: 'aria', text: '你連惡夢都征服了……但暮影的源頭還在更深的地方。' },
      { who: 'aria', text: '「地獄難度」開放了。那裡只有最強的守護者能活著回來。' },
    ],
  },
  hell_end: {
    id: 'hell_end', title: '永晝',
    lines: [
      { who: 'aria', text: '……你做到了。暮影的源頭消散了。' },
      { who: 'mila', text: '大陸的天空，第一次這麼亮。' },
      { who: 'aria', text: '謝謝你，守護者。接下來的冒險，就隨你喜歡吧——無盡之塔還在等著你。' },
    ],
  },
};
