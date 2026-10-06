'use strict';

// 圖片放在 assets/ 底下；找不到圖時自動退回 emoji。
// 檔名清單與生圖 prompt 請見 ART_PROMPTS.md。

const ATTRS = ['str', 'dex', 'int', 'con'];

const CLASSES = {
  warrior: {
    name: '劍士', avatar: '🤺', img: 'assets/classes/warrior.png',
    desc: '生命與防禦最高，穩紮穩打的近戰職業。',
    base: { str: 12, dex: 6, int: 4, con: 12 },
    grow: { str: 2.0, dex: 0.6, int: 0.3, con: 1.6 },
    main: 'str', interval: 1400, critDmg: 150,
    atk: s => s.str * 2.2,
    weapon: { noun: '長劍', icon: '🗡️' },
    skills: [
      { id: 'bash', name: '重擊', icon: '💥', lv: 1, mp: 6, cd: 4000, hits: 1, mult: 1.8, desc: '造成 180% 傷害' },
      { id: 'whirl', name: '旋風斬', icon: '🌀', lv: 15, mp: 16, cd: 10000, hits: 1, mult: 3.5, desc: '造成 350% 傷害' },
      { id: 'skybreak', name: '破天斬', icon: '⚡', lv: 35, mp: 30, cd: 18000, hits: 1, mult: 6.5, desc: '造成 650% 傷害' },
    ],
  },
  ranger: {
    name: '遊俠', avatar: '🧝', img: 'assets/classes/ranger.png',
    desc: '攻速快、暴擊高，靈巧的遠程射手。',
    base: { str: 6, dex: 13, int: 5, con: 8 },
    grow: { str: 0.6, dex: 2.2, int: 0.4, con: 1.1 },
    main: 'dex', interval: 1100, critDmg: 180,
    atk: s => s.dex * 1.8 + s.str * 0.4,
    weapon: { noun: '長弓', icon: '🏹' },
    skills: [
      { id: 'double', name: '二連射', icon: '🎯', lv: 1, mp: 5, cd: 3000, hits: 2, mult: 1.0, desc: '連續射擊 2 次，每次 100% 傷害' },
      { id: 'rain', name: '箭雨', icon: '🌧️', lv: 15, mp: 14, cd: 9000, hits: 5, mult: 0.9, desc: '射出 5 支箭，每支 90% 傷害' },
      { id: 'pierce', name: '穿雲箭', icon: '☄️', lv: 35, mp: 26, cd: 16000, hits: 1, mult: 4.5, forceCrit: true, desc: '必定暴擊，450% 傷害' },
    ],
  },
  mage: {
    name: '法師', avatar: '🧙', img: 'assets/classes/mage.png',
    desc: '魔法無視防禦，爆發力最強但身板脆弱。',
    base: { str: 4, dex: 6, int: 14, con: 7 },
    grow: { str: 0.3, dex: 0.6, int: 2.4, con: 1.0 },
    main: 'int', interval: 1500, critDmg: 150,
    atk: s => s.int * 2.3,
    weapon: { noun: '法杖', icon: '🪄' },
    skills: [
      { id: 'fireball', name: '火球術', icon: '🔥', lv: 1, mp: 8, cd: 3000, hits: 1, mult: 2.4, ignoreDef: true, desc: '無視防禦，240% 傷害' },
      { id: 'frost', name: '冰封領域', icon: '❄️', lv: 15, mp: 20, cd: 10000, hits: 4, mult: 1.3, ignoreDef: true, desc: '無視防禦，4 次 130% 傷害' },
      { id: 'meteor', name: '隕石術', icon: '🌠', lv: 35, mp: 38, cd: 18000, hits: 1, mult: 7.5, ignoreDef: true, desc: '無視防禦，750% 傷害' },
    ],
  },
  cleric: {
    name: '祭司', avatar: '😇', img: 'assets/classes/cleric.png',
    desc: '攻守兼備，能自我治療，最不容易倒下。',
    base: { str: 9, dex: 5, int: 10, con: 11 },
    grow: { str: 1.2, dex: 0.5, int: 1.4, con: 1.4 },
    main: 'int', interval: 1400, critDmg: 150,
    atk: s => s.str * 1.5 + s.int * 1.6,
    weapon: { noun: '戰錘', icon: '🔨' },
    skills: [
      { id: 'heal', name: '治癒術', icon: '💚', lv: 1, mp: 8, cd: 6000, hits: 0, heal: 0.3, cond: 'lowHp', desc: '生命低於 60% 時回復 30% 生命' },
      { id: 'judge', name: '神聖審判', icon: '✨', lv: 15, mp: 15, cd: 8000, hits: 1, mult: 2.8, heal: 0.1, desc: '280% 傷害並回復 10% 生命' },
      { id: 'angel', name: '天使降臨', icon: '👼', lv: 35, mp: 32, cd: 20000, hits: 2, mult: 2.5, heal: 0.5, desc: '回復 50% 生命，2 次 250% 傷害' },
    ],
  },
};

const BOSS_KILLS = 25;

const ZONES = [
  { id: 'meadow', name: '新手草原', icon: '🌾', lv: [1, 5], theme: ['#35552d', '#16240f'],
    mobs: [['snail', '草原蝸牛', '🐌'], ['rabbit', '跳跳兔', '🐇'], ['goblin', '小哥布林', '👺']],
    boss: ['goblin_chief', '哥布林隊長', '👹'] },
  { id: 'forest', name: '迷霧森林', icon: '🌲', lv: [5, 12], theme: ['#24443d', '#0c1a17'],
    mobs: [['wolf', '灰狼', '🐺'], ['spider', '巨型蜘蛛', '🕷️'], ['shroom', '毒蘑菇', '🍄']],
    boss: ['bear', '森林巨熊', '🐻'] },
  { id: 'mine', name: '古代礦坑', icon: '⛏️', lv: [12, 20], theme: ['#4a3b2c', '#1a140e'],
    mobs: [['bat', '吸血蝙蝠', '🦇'], ['skeleton', '骷髏兵', '💀'], ['golem', '石像怪', '🗿']],
    boss: ['troll', '礦坑巨魔', '🧌'] },
  { id: 'desert', name: '沙漠遺跡', icon: '🏜️', lv: [20, 30], theme: ['#7a5a2a', '#2b1e0c'],
    mobs: [['scorpion', '沙漠蠍', '🦂'], ['snake', '響尾蛇', '🐍'], ['mummy', '木乃伊', '🧟']],
    boss: ['sphinx', '遺跡獅身獸', '🦁'] },
  { id: 'snow', name: '冰封山脈', icon: '🏔️', lv: [30, 42], theme: ['#3d5a78', '#111c2a'],
    mobs: [['yeti', '雪怪', '🦍'], ['ice', '冰晶元素', '❄️'], ['mammoth', '長毛象', '🦣']],
    boss: ['frost_dragon', '冰霜巨龍', '🐉'] },
  { id: 'volcano', name: '火山深淵', icon: '🌋', lv: [42, 55], theme: ['#6e2a1c', '#200a06'],
    mobs: [['salamander', '火蜥蜴', '🦎'], ['magma', '熔岩魔像', '🪨'], ['imp', '小惡魔', '😈']],
    boss: ['balrog', '炎魔', '👿'] },
  { id: 'sky', name: '天空之城', icon: '🏰', lv: [55, 70], theme: ['#4b5d8f', '#141a33'],
    mobs: [['thunderbird', '雷鳥', '🦅'], ['sylph', '風之精靈', '🧚'], ['automaton', '機械守衛', '🤖']],
    boss: ['storm_king', '風暴之王', '🌪️'] },
  { id: 'abyss', name: '混沌深淵', icon: '🕳️', lv: [70, 70], theme: ['#3a1f4f', '#0b0612'], endless: true,
    mobs: [['eye', '虛空之眼', '👁️'], ['shade', '暗影', '👤'], ['tentacle', '混沌觸手', '🦑']],
    boss: ['chaos_dragon', '混沌魔龍', '🐲'] },
];

const SLOTS = ['weapon', 'helmet', 'armor', 'gloves', 'boots', 'ring', 'amulet'];

const SLOT_INFO = {
  weapon: { name: '武器' },
  helmet: { name: '頭盔', noun: '頭盔', icon: '⛑️' },
  armor: { name: '盔甲', noun: '鎧甲', icon: '🥋' },
  gloves: { name: '手套', noun: '手套', icon: '🧤' },
  boots: { name: '靴子', noun: '長靴', icon: '👢' },
  ring: { name: '戒指', noun: '戒指', icon: '💍' },
  amulet: { name: '項鍊', noun: '項鍊', icon: '📿' },
};

const SLOT_BASE = {
  weapon: l => ({ atk: 5 + l * 2.4 }),
  helmet: l => ({ def: 1.5 + l * 0.5, hp: 5 + l * 3 }),
  armor: l => ({ def: 3 + l * 1.0, hp: 10 + l * 4 }),
  gloves: l => ({ atk: 1 + l * 0.5, def: 1 + l * 0.3 }),
  boots: l => ({ def: 1 + l * 0.4, hp: 5 + l * 2 }),
  ring: l => ({ atk: 1 + l * 0.6, crit: 1 + l * 0.03 }),
  amulet: l => ({ hp: 15 + l * 6, def: 0.5 + l * 0.2 }),
};

const TIERS = ['木製', '青銅', '鐵製', '鋼鐵', '秘銀', '精靈', '矮人', '龍骨', '星辰', '神諭'];

const RARITY = [
  { name: '普通', color: '#c9ccd3', mult: 1.0, affixes: 0, weight: 600 },
  { name: '精良', color: '#5fd35f', mult: 1.25, affixes: 1, weight: 260 },
  { name: '稀有', color: '#4aa3ff', mult: 1.6, affixes: 2, weight: 105 },
  { name: '史詩', color: '#c070ff', mult: 2.1, affixes: 3, weight: 30 },
  { name: '傳說', color: '#ffa53a', mult: 2.8, affixes: 4, weight: 5 },
];
const BOSS_RARITY_WEIGHTS = [0, 400, 420, 150, 30];

const AFFIXES = [
  { key: 'str', roll: l => Math.ceil((1 + l * 0.35) * (0.7 + Math.random() * 0.5)) },
  { key: 'dex', roll: l => Math.ceil((1 + l * 0.35) * (0.7 + Math.random() * 0.5)) },
  { key: 'int', roll: l => Math.ceil((1 + l * 0.35) * (0.7 + Math.random() * 0.5)) },
  { key: 'con', roll: l => Math.ceil((1 + l * 0.35) * (0.7 + Math.random() * 0.5)) },
  { key: 'crit', roll: l => 0.5 + Math.random() + l * 0.03 },
  { key: 'hpPct', roll: l => 1 + Math.random() * 2 + l * 0.05 },
  { key: 'atkPct', roll: l => 1 + Math.random() * 2 + l * 0.05 },
  { key: 'gold', roll: () => 3 + Math.random() * 5 },
  { key: 'xp', roll: () => 3 + Math.random() * 5 },
];

const STAT_LABEL = {
  atk: '攻擊力', def: '防禦力', hp: '生命值', crit: '暴擊率',
  str: '力量', dex: '敏捷', int: '智力', con: '體質',
  hpPct: '生命', atkPct: '攻擊力', gold: '金幣獲得', xp: '經驗獲得',
};
const PCT_KEYS = new Set(['crit', 'hpPct', 'atkPct', 'gold', 'xp']);

const ATTR_HELP = {
  str: '劍士、祭司的攻擊力來源',
  dex: '暴擊率、閃避、攻擊速度；遊俠的攻擊力來源',
  int: '魔力上限；法師、祭司的攻擊力來源',
  con: '生命值與防禦力',
};

const POTIONS = [
  { id: 'p1', name: '初級治療藥水', icon: '🍶', heal: 120, price: 12 },
  { id: 'p2', name: '中級治療藥水', icon: '🧪', heal: 450, price: 50 },
  { id: 'p3', name: '高級治療藥水', icon: '⚗️', heal: 1500, price: 180 },
  { id: 'p4', name: '極致治療藥水', icon: '💖', healPct: 50, price: 600 },
];

const STONE_PRICE = 200;
const SCROLL_PRICE = 3000;
const MAX_ENH = 15;
// 從 +n 強化到 +n+1 的成功率（%）
const ENH_RATES = [100, 100, 100, 90, 80, 70, 60, 50, 40, 32, 25, 20, 15, 10, 6];
const ENH_SAFE = 7; // 目前等級 >= 此值時失敗會碎裂
const INV_MAX = 50;
