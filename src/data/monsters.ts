import type { MonsterDef } from '@/core/types';

const M = (d: MonsterDef) => d;

export const MONSTERS: MonsterDef[] = [
  // ---------------- 1 晨露草原 ----------------
  M({ id: 'slime', name: '露珠史萊姆', archetype: 'slime', family: 'slime', palette: ['#6fd36a', '#3f9a44', '#1d3a1c'], dmgType: 'phys', element: 'phys', hp: 0.9, atk: 0.8, lore: '吸收晨露長大的史萊姆，碰到會黏黏的。' }),
  M({ id: 'hare', name: '尖牙野兔', archetype: 'beast', family: 'beast', palette: ['#c9a27a', '#f3e3cf', '#3a2516'], features: ['ears', 'small'], size: 0.8, dmgType: 'phys', element: 'phys', hp: 0.7, atk: 0.9, eva: 2, interval: 1.4, lore: '外表可愛，牙齒卻能咬穿皮靴。' }),
  M({ id: 'goblin', name: '哥布林斥候', archetype: 'humanoid', family: 'humanoid', palette: ['#7fb04a', '#6b4a2a', '#ffe35c'], features: ['ears', 'dagger'], size: 0.85, dmgType: 'phys', element: 'phys', atk: 1.1, interval: 1.6, lore: '哥布林部落的偵察兵，手腳很快。' }),
  M({ id: 'boar', name: '暴躁野豬', archetype: 'beast', family: 'beast', palette: ['#7a5236', '#4a2f1e', '#f2e8d0'], features: ['tusks'], dmgType: 'phys', element: 'phys', hp: 1.4, atk: 1.1, def: 1.3, interval: 2, skills: ['e_bite'], lore: '橫衝直撞的野豬，被惹毛就停不下來。' }),
  M({ id: 'goblin_king', name: '哥布林王 格魯克', archetype: 'humanoid', family: 'humanoid', palette: ['#5f9a3a', '#8a2a2a', '#f0c85a'], features: ['ears', 'crown', 'club', 'cape'], size: 1.5, boss: true, hp: 0.75, dmgType: 'phys', element: 'phys', skills: ['boss_slam', 'boss_enrage'], mech: 'guard', minion: 'goblin', lore: '撿到晨曦碎片後自封為王，開始騷擾附近的村莊。' }),

  // ---------------- 2 迷霧森林 ----------------
  M({ id: 'wolf', name: '霧影灰狼', archetype: 'beast', family: 'beast', palette: ['#8a8f99', '#5a5f69', '#ffd34a'], features: ['mane'], dmgType: 'phys', element: 'phys', atk: 1.15, interval: 1.4, eva: 1.5, skills: ['e_bite'], lore: '在霧中成群狩獵，只看得見發亮的眼睛。' }),
  M({ id: 'shroom', name: '毒傘菇人', archetype: 'plant', family: 'plant', palette: ['#c8463c', '#f2e2c4', '#ffffff'], features: ['cap'], dmgType: 'magic', element: 'shadow', hp: 1.2, res: 1.5, skills: ['e_poison'], resist: { shadow: 40, fire: -40 }, lore: '傘蓋上的白點是劇毒孢子。' }),
  M({ id: 'spider', name: '巨網蜘蛛', archetype: 'insect', family: 'beast', palette: ['#3a2f3f', '#8a3a7a', '#ff4a4a'], features: ['legs8'], dmgType: 'phys', element: 'shadow', atk: 1.1, skills: ['e_poison'], resist: { shadow: 30 }, lore: '牠的網堅韌到能困住一頭鹿。' }),
  M({ id: 'wisp', name: '迷途精魂', archetype: 'spirit', family: 'elemental', palette: ['#8affc8', '#3ac8a0', '#ffffff'], dmgType: 'magic', element: 'shadow', hp: 0.8, eva: 3, res: 2, ranged: true, resist: { phys: 30, holy: -50 }, lore: '迷失在霧裡的旅人魂魄。' }),
  M({ id: 'treant', name: '腐化樹人 艾爾德', archetype: 'plant', family: 'plant', palette: ['#5a4030', '#3f7a3a', '#c8ff6a'], features: ['treant', 'leaves'], size: 1.7, boss: true, hp: 0.85, dmgType: 'magic', element: 'shadow', def: 1.4, skills: ['boss_poisoncloud', 'boss_slam'], mech: 'regen', resist: { shadow: 40, fire: -50 }, lore: '守護森林千年的樹人，被碎片的暮影之力腐化。' }),

  // ---------------- 3 遺忘礦坑 ----------------
  M({ id: 'bat', name: '吸血蝙蝠', archetype: 'bird', family: 'beast', palette: ['#4a3a4f', '#2a1f2f', '#ff4a4a'], features: ['batwings'], size: 0.8, dmgType: 'phys', element: 'phys', hp: 0.7, eva: 3, interval: 1.2, skills: ['e_bite'], lore: '成群棲息在礦坑頂端，聽到聲音就俯衝。' }),
  M({ id: 'skel_miner', name: '骷髏礦工', archetype: 'undead', family: 'undead', palette: ['#e8e2d0', '#6b5a3a', '#7affff'], features: ['pickaxe', 'helmet'], dmgType: 'phys', element: 'phys', def: 1.3, resist: { shadow: 50, holy: -50, ice: 20 }, lore: '礦坑崩塌時被埋的礦工，至今仍在挖掘。' }),
  M({ id: 'rock_golem', name: '岩石魔像', archetype: 'golem', family: 'construct', palette: ['#8a8378', '#5a554d', '#7ad8ff'], features: ['crystals'], dmgType: 'phys', element: 'phys', hp: 1.6, def: 2.2, atk: 1.1, interval: 2.2, resist: { phys: 20, lightning: -30 }, lore: '礦脈中的水晶讓岩石有了生命。' }),
  M({ id: 'rat_king', name: '礦坑巨鼠', archetype: 'beast', family: 'beast', palette: ['#6b6058', '#d8a0a0', '#ff4a4a'], features: ['ears', 'tail'], dmgType: 'phys', element: 'shadow', interval: 1.3, skills: ['e_poison'], lore: '吃礦石長大的巨鼠，咬傷會感染。' }),
  M({ id: 'troll', name: '深淵巨魔 戈爾', archetype: 'giant', family: 'humanoid', palette: ['#6a7f8a', '#4a3a2a', '#ffcf4a'], features: ['club', 'tusks'], size: 1.8, boss: true, dmgType: 'phys', element: 'phys', hp: 1.5, def: 1.5, skills: ['boss_slam', 'boss_enrage'], mech: 'skin', resist: { phys: 15 }, lore: '從礦坑最深處爬出的巨魔，傷口會快速癒合。' }),

  // ---------------- 4 赤沙遺跡 ----------------
  M({ id: 'scorpion', name: '赤沙巨蠍', archetype: 'insect', family: 'beast', palette: ['#c8783a', '#7a3a1a', '#ffe35c'], features: ['stinger', 'claws'], dmgType: 'phys', element: 'shadow', def: 1.6, skills: ['e_poison'], resist: { fire: 30 }, lore: '外殼被烈日烤得發燙。' }),
  M({ id: 'sand_serpent', name: '流沙巨蛇', archetype: 'serpent', family: 'beast', palette: ['#d8b06a', '#8a6a3a', '#3a2a1a'], dmgType: 'phys', element: 'phys', eva: 2, interval: 1.5, skills: ['e_bite'], lore: '潛伏在沙下，等獵物踩上來。' }),
  M({ id: 'mummy', name: '遺跡木乃伊', archetype: 'undead', family: 'undead', palette: ['#e8dcc0', '#a89878', '#4affd8'], features: ['bandage'], hp: 1.4, dmgType: 'magic', element: 'shadow', skills: ['e_dark'], resist: { shadow: 40, holy: -50, fire: -40 }, lore: '守護法老陵墓的不死衛兵。' }),
  M({ id: 'fire_elem', name: '烈陽元素', archetype: 'elemental', family: 'elemental', palette: ['#ff8a3a', '#ffd04a', '#fff6c8'], features: ['flame'], dmgType: 'magic', element: 'fire', ranged: true, res: 2, skills: ['e_fire'], resist: { fire: 75, ice: -50 }, lore: '沙漠正午的熱浪凝聚而成。' }),
  M({ id: 'pharaoh', name: '法老亡魂 塞特', archetype: 'undead', family: 'undead', palette: ['#e8d8a8', '#2a4a9a', '#f0c85a'], features: ['pharaoh', 'staff'], size: 1.6, boss: true, hp: 2.1, dmgType: 'magic', element: 'shadow', res: 1.6, skills: ['summon:mummy', 'boss_shield'], mech: 'doomcast', resist: { shadow: 50, holy: -40 }, lore: '以碎片之力從長眠中甦醒的古代法老。' }),

  // ---------------- 5 霜語山脈 ----------------
  M({ id: 'snow_wolf', name: '霜牙雪狼', archetype: 'beast', family: 'beast', palette: ['#e8eef5', '#9ab0c8', '#4ab8ff'], features: ['mane'], dmgType: 'phys', element: 'ice', interval: 1.3, skills: ['e_frost'], resist: { ice: 50, fire: -30 }, lore: '雪地中的白色獵手。' }),
  M({ id: 'ice_elem', name: '冰晶元素', archetype: 'elemental', family: 'elemental', palette: ['#9ae0ff', '#e0f6ff', '#ffffff'], features: ['shards'], dmgType: 'magic', element: 'ice', ranged: true, def: 1.4, skills: ['e_frost'], resist: { ice: 75, fire: -50 }, lore: '萬年寒冰中誕生的元素。' }),
  M({ id: 'yeti', name: '山岳雪怪', archetype: 'giant', family: 'beast', palette: ['#f0f2f5', '#8aa0b8', '#3a4a6a'], features: ['fur'], size: 1.2, hp: 1.7, atk: 1.2, interval: 2, dmgType: 'phys', element: 'ice', resist: { ice: 40 }, lore: '傳說中的雪人，力氣大得能推倒松樹。' }),
  M({ id: 'harpy', name: '冰翼鳥妖', archetype: 'bird', family: 'beast', palette: ['#7aa8d8', '#e0ecf8', '#ffd34a'], features: ['wings'], dmgType: 'magic', element: 'ice', eva: 2.5, ranged: true, skills: ['e_frost'], resist: { ice: 40, lightning: -30 }, lore: '在暴風雪中歌唱的鳥妖。' }),
  M({ id: 'frost_dragon', name: '冰霜巨龍 斯卡迪', archetype: 'dragon', family: 'dragon', palette: ['#8ac8f0', '#e0f4ff', '#3a6aa8'], features: ['wings', 'horns'], size: 1.9, boss: true, dmgType: 'magic', element: 'ice', hp: 1.7, skills: ['boss_shield', 'boss_enrage'], mech: 'breath', resist: { ice: 60, fire: -30 }, lore: '沉睡在山巔的古龍，碎片讓牠陷入瘋狂。' }),

  // ---------------- 6 熔心火山 ----------------
  M({ id: 'salamander', name: '熔岩火蜥', archetype: 'serpent', family: 'beast', palette: ['#e8503a', '#ffb04a', '#2a1a1a'], features: ['legs', 'flame'], dmgType: 'magic', element: 'fire', skills: ['e_fire'], resist: { fire: 60, ice: -40 }, lore: '在岩漿中游泳的蜥蜴。' }),
  M({ id: 'lava_golem', name: '熔岩魔像', archetype: 'golem', family: 'construct', palette: ['#3a2a2a', '#ff6a2a', '#ffd04a'], features: ['lava'], hp: 1.7, def: 2, interval: 2.2, dmgType: 'phys', element: 'fire', resist: { fire: 70, ice: -40, phys: 10 }, lore: '冷卻的岩漿外殼下是沸騰的核心。' }),
  M({ id: 'imp', name: '火焰小惡魔', archetype: 'humanoid', family: 'demon', palette: ['#d83a3a', '#2a1a1a', '#ffd04a'], features: ['horns', 'batwings', 'tail'], size: 0.8, dmgType: 'magic', element: 'fire', eva: 2.5, ranged: true, skills: ['e_fire'], resist: { fire: 50, holy: -30 }, lore: '喜歡惡作劇的小惡魔，會丟火球。' }),
  M({ id: 'hellhound', name: '地獄犬', archetype: 'beast', family: 'demon', palette: ['#2a1a1a', '#ff5a2a', '#ffd04a'], features: ['mane', 'flame'], atk: 1.25, interval: 1.3, dmgType: 'phys', element: 'fire', skills: ['e_bite', 'e_fire'], resist: { fire: 50, holy: -30 }, lore: '鬃毛燃燒著地獄之火的獵犬。' }),
  M({ id: 'balrog', name: '炎魔 巴爾洛斯', archetype: 'giant', family: 'demon', palette: ['#4a1a1a', '#ff6a2a', '#ffe04a'], features: ['horns', 'batwings', 'flame'], size: 1.9, boss: true, hp: 1.9, dmgType: 'magic', element: 'fire', atk: 1.1, skills: ['boss_firenova', 'boss_slam'], mech: 'inferno', resist: { fire: 70, ice: -30, holy: -20 }, lore: '火山深處的古老炎魔，用碎片點燃了整座火山。' }),

  // ---------------- 7 雷鳴天城 ----------------
  M({ id: 'thunderbird', name: '雷鳴鳥', archetype: 'bird', family: 'elemental', palette: ['#3a6ad8', '#ffe35c', '#ffffff'], features: ['wings', 'crest'], dmgType: 'magic', element: 'lightning', eva: 2.5, ranged: true, skills: ['e_shock'], resist: { lightning: 60 }, lore: '振翅就會打雷的神鳥。' }),
  M({ id: 'sylph', name: '風之精靈', archetype: 'spirit', family: 'elemental', palette: ['#c8f0e0', '#7ad8c8', '#ffffff'], dmgType: 'magic', element: 'lightning', eva: 4, ranged: true, hp: 0.8, resist: { phys: 30 }, lore: '天空之城的守衛精靈，身形難以捉摸。' }),
  M({ id: 'automaton', name: '機械守衛', archetype: 'golem', family: 'construct', palette: ['#b8915a', '#6a5030', '#4ab8ff'], features: ['gear', 'spear'], hp: 1.5, def: 2.4, dmgType: 'phys', element: 'lightning', skills: ['e_shock'], resist: { phys: 25, lightning: 30, ice: -20 }, lore: '古代文明留下的發條守衛。' }),
  M({ id: 'sky_knight', name: '天空騎士', archetype: 'humanoid', family: 'humanoid', palette: ['#d8dce8', '#3a5aa8', '#ffe35c'], features: ['helmet', 'spear', 'wings'], atk: 1.2, def: 1.6, dmgType: 'phys', element: 'lightning', skills: ['e_shock'], lore: '被暮影迷惑的天城騎士。' }),
  M({ id: 'storm_king', name: '風暴君王 托爾納', archetype: 'elemental', family: 'elemental', palette: ['#3a4a8a', '#ffe35c', '#c8e0ff'], features: ['crown', 'storm'], size: 1.9, boss: true, hp: 1.5, dmgType: 'magic', element: 'lightning', skills: ['boss_thunder', 'summon:thunderbird'], mech: 'barrier', resist: { lightning: 60, phys: 20 }, lore: '統御天空之城的風暴化身。' }),

  // ---------------- 8 暮影深淵 ----------------
  M({ id: 'void_eye', name: '虛空之眼', archetype: 'eye', family: 'demon', palette: ['#3a1f4f', '#b67bff', '#ff4a8a'], dmgType: 'magic', element: 'shadow', ranged: true, res: 2, skills: ['e_dark'], resist: { shadow: 60, holy: -40 }, lore: '從深淵裂縫中窺視的眼睛。' }),
  M({ id: 'shade', name: '暮影刺客', archetype: 'humanoid', family: 'demon', palette: ['#1f1a2a', '#6a4a9a', '#ff4a8a'], features: ['hood', 'dagger'], atk: 1.3, eva: 3, interval: 1.2, dmgType: 'phys', element: 'shadow', resist: { shadow: 50, holy: -40 }, lore: '暮影之主的爪牙，來無影去無蹤。' }),
  M({ id: 'tentacle', name: '深淵觸手', archetype: 'serpent', family: 'demon', palette: ['#4a2a5a', '#8a4aa8', '#c8ff6a'], features: ['tentacle'], hp: 1.5, dmgType: 'magic', element: 'shadow', skills: ['e_poison'], resist: { shadow: 50 }, lore: '從虛空伸出的觸手，不知道本體在哪。' }),
  M({ id: 'fallen_knight', name: '墮落騎士', archetype: 'undead', family: 'undead', palette: ['#3a3a4a', '#8a2a3a', '#ff4a4a'], features: ['helmet', 'sword', 'cape'], atk: 1.25, def: 2, hp: 1.3, dmgType: 'phys', element: 'shadow', skills: ['e_dark'], resist: { shadow: 50, holy: -50 }, lore: '曾經的曙光騎士，如今為暮影效命。' }),
  M({ id: 'nox', name: '暮影之主 諾克斯', archetype: 'dragon', family: 'demon', palette: ['#2a1a3a', '#8a4ad8', '#ff4a8a'], features: ['wings', 'horns', 'crown'], size: 2.1, boss: true, dmgType: 'magic', element: 'shadow', hp: 1.6, atk: 1.15, skills: ['boss_void', 'boss_enrage'], mech: 'finale', minion: 'shade', resist: { shadow: 70, holy: -30 }, lore: '擊碎永晝水晶的元兇，渴望讓大陸永遠沉入黃昏。' }),

  // ---------------- 副本 / 高塔專用 ----------------
  M({ id: 'gold_goblin', name: '寶藏哥布林', archetype: 'humanoid', family: 'humanoid', palette: ['#d8b04a', '#8a5a2a', '#fff2a8'], features: ['ears', 'sack'], dmgType: 'phys', element: 'phys', hp: 1.2, atk: 0.6, lore: '背著一大袋金幣逃跑的哥布林。' }),
  M({ id: 'crystal_golem', name: '晶石魔像', archetype: 'golem', family: 'construct', palette: ['#6a7ad8', '#b8c8ff', '#ffffff'], features: ['crystals'], hp: 1.4, def: 2, atk: 0.7, dmgType: 'phys', element: 'phys', lore: '全身都是強化石的魔像。' }),
  M({ id: 'trial_spirit', name: '試煉之靈', archetype: 'spirit', family: 'elemental', palette: ['#ffe8a8', '#f0c85a', '#ffffff'], dmgType: 'magic', element: 'holy', hp: 1.1, atk: 0.8, lore: '神殿用來考驗守護者的光之靈。' }),
];

export const MONSTER_MAP = new Map(MONSTERS.map(m => [m.id, m]));
export const getMonster = (id: string) => {
  const m = MONSTER_MAP.get(id);
  if (!m) throw new Error('未知怪物 ' + id);
  return m;
};
