import type { Element, Mod, Primary, StatKey } from './stats';

// =====================================================================
// 內容定義（data/ 底下的資料都符合這些型別）
// =====================================================================

/** [基礎值, 每級增加] */
export type Scaling = readonly [number, number] | number;
export const scale = (s: Scaling, rank: number) => (typeof s === 'number' ? s : s[0] + s[1] * (rank - 1));

export type ClassId = 'warrior' | 'ranger' | 'mage' | 'cleric';
export type AdvId =
  | 'berserker' | 'paladin'
  | 'marksman' | 'assassin'
  | 'elementalist' | 'warlock'
  | 'archbishop' | 'inquisitor';

export type DmgType = 'phys' | 'magic';
export type TargetMode = 'front' | 'all' | 'random' | 'lowest' | 'self' | 'highest';

export type StatusId = 'burn' | 'chill' | 'freeze' | 'shock' | 'bleed' | 'poison' | 'stun' | 'weaken' | 'curse';

export interface StatusApply {
  id: StatusId;
  /** 0~1 的觸發機率 */
  chance: number;
  stacks?: number;
}

export type FxKey =
  | 'slash' | 'heavy' | 'sweep' | 'bash' | 'whirl' | 'arrow' | 'multiarrow' | 'snipe' | 'rain'
  | 'fireball' | 'meteor' | 'frost' | 'blizzard' | 'chain' | 'shadowbolt' | 'doom'
  | 'holy' | 'nova' | 'hammer' | 'heal' | 'shield' | 'buff' | 'poison' | 'blades' | 'summon'
  | 'bite' | 'claw' | 'spit' | 'breath' | 'slam' | 'storm' | 'magic';

export type SkillEffect =
  | {
    type: 'damage';
    target: TargetMode;
    hits: number;
    /** target 為 random 時每一下各自隨機 */
    mult: Scaling;
    dmgType: DmgType;
    element: Element;
    status?: StatusApply[];
    /** 無視防禦比例 0~1 */
    pierce?: number;
    /** 額外暴擊率（百分點） */
    bonusCrit?: number;
  }
  | { type: 'heal'; pct: Scaling }
  | { type: 'shield'; pct: Scaling; dur: number }
  | { type: 'buff'; id: string; name: string; dur: number; mods: (rank: number) => Mod[] }
  | { type: 'debuff'; target: TargetMode; status: StatusApply }
  | { type: 'summon'; id: string; name: string; dur: number; interval: number; mult: Scaling; dmgType: DmgType; element: Element; archetype: string }
  | { type: 'spawn'; monster: string; count: number };

export type SkillCond = 'hpBelow70' | 'hpBelow50' | 'hpBelow30' | 'enemies2' | 'enemies3' | 'boss' | 'buffMissing' | 'once';

export interface SkillDef {
  id: string;
  name: string;
  icon: string;
  classId: ClassId | 'enemy';
  advId?: AdvId;
  unlock: number;
  maxRank?: number;
  mp: Scaling;
  /** 秒 */
  cd: number;
  /** 詠唱時間（秒），首領大招用；期間被暈眩會打斷 */
  cast?: number;
  effects: SkillEffect[];
  cond?: SkillCond;
  fx: FxKey;
  ultimate?: boolean;
  desc: string;
}

export interface BasicAttack {
  dmgType: DmgType;
  element: Element;
  fx: FxKey;
  ranged: boolean;
}

export interface ClassDef {
  id: ClassId;
  name: string;
  title: string;
  desc: string;
  role: string;
  main: Primary;
  base: Record<Primary, number>;
  growth: Record<Primary, number>;
  /** 主屬性額外換算（疊加在通用換算上） */
  conversion: Partial<Record<Primary, Partial<Record<StatKey, number>>>>;
  baseStats: { hp: number; mp: number; atk: number; matk: number; def: number; res: number; crit: number; critDmg: number; mpRegen: number };
  interval: number;
  basic: BasicAttack;
  weaponKind: WeaponKind;
  offhandKind: OffhandKind;
  look: HeroLook;
  /** 自動配點比例 */
  autoAlloc: Record<Primary, number>;
}

export interface AdvDef {
  id: AdvId;
  classId: ClassId;
  name: string;
  desc: string;
  mods: Mod[];
  look: Partial<HeroLook>;
}

export interface HeroLook {
  skin: string;
  hair: string;
  hairStyle: 'short' | 'long' | 'spiky' | 'hood' | 'bald' | 'pony';
  outfit: string;
  outfit2: string;
  trim: string;
  hat: 'none' | 'helm' | 'wizard' | 'hood' | 'circlet' | 'horned' | 'crown';
  weapon: WeaponKind;
  offhand: OffhandKind | 'none';
  cape?: string;
}

export type WeaponKind = 'sword' | 'bow' | 'staff' | 'mace';
export type OffhandKind = 'shield' | 'quiver' | 'orb' | 'relic';

export interface TalentNode {
  id: string;
  name: string;
  icon: string;
  tier: number; // 0..5
  col: number; // 0..2
  maxRank: number;
  req?: string;
  mods?: (rank: number) => Mod[];
  power?: { id: string; value: (rank: number) => number };
  desc: (rank: number) => string;
}

export interface TalentTree {
  classId: ClassId;
  nodes: TalentNode[];
}

export type Archetype =
  | 'slime' | 'beast' | 'bird' | 'insect' | 'humanoid' | 'undead' | 'golem' | 'plant'
  | 'serpent' | 'elemental' | 'eye' | 'dragon' | 'giant' | 'spirit';

export type Family = 'beast' | 'undead' | 'demon' | 'elemental' | 'construct' | 'humanoid' | 'plant' | 'dragon' | 'slime';

export interface MonsterDef {
  id: string;
  name: string;
  archetype: Archetype;
  family: Family;
  palette: [string, string, string];
  features?: string[];
  size?: number;
  hp?: number;
  atk?: number;
  def?: number;
  res?: number;
  eva?: number;
  interval?: number;
  dmgType: DmgType;
  element: Element;
  ranged?: boolean;
  resist?: Partial<Record<Element, number>>;
  skills?: string[];
  boss?: boolean;
  lore?: string;
}

export interface RegionDef {
  id: string;
  name: string;
  subtitle: string;
  monsters: string[];
  boss: string;
  bg: BackgroundTheme;
  music: { root: number; scale: 'major' | 'minor' | 'dorian' | 'phrygian' | 'lydian'; tempo: number };
}

export interface BackgroundTheme {
  sky: [string, string];
  far: string;
  mid: string;
  near: string;
  ground: [string, string];
  layers: ('hills' | 'mountains' | 'trees' | 'pines' | 'rocks' | 'pillars' | 'dunes' | 'spikes' | 'clouds' | 'towers' | 'crystals' | 'void')[];
  particles: 'fireflies' | 'leaves' | 'dust' | 'sand' | 'snow' | 'embers' | 'sparks' | 'motes' | 'none';
  sun?: string;
}

// ---------- 裝備 ----------
export type SlotId = 'weapon' | 'offhand' | 'helmet' | 'armor' | 'gloves' | 'belt' | 'boots' | 'amulet' | 'ring1' | 'ring2';
export type ItemSlotKind = Exclude<SlotId, 'ring1' | 'ring2'> | 'ring';
export type Rarity = 0 | 1 | 2 | 3 | 4 | 5;

export interface AffixDef {
  id: string;
  stat: Mod['stat'];
  kind: Mod['kind'];
  /** 物品等級 1 時的數值範圍，會依等級成長 */
  min: number;
  max: number;
  /** 每物品等級增加的倍率（0 = 不隨等級成長） */
  growth: number;
  weight: number;
  slots: ItemSlotKind[] | 'all';
  minIlvl?: number;
  group?: string;
}

export interface UniqueDef {
  id: string;
  name: string;
  slot: ItemSlotKind;
  classId?: ClassId;
  minIlvl: number;
  affixes: { id: string; mult?: number }[];
  power: { id: string; value: number };
  flavor: string;
}

export interface SetDef {
  id: string;
  name: string;
  classId?: ClassId;
  pieces: { slot: ItemSlotKind; name: string }[];
  bonus2: Mod[];
  bonus4: { mods: Mod[]; power?: { id: string; value: number } };
}

export interface PetDef {
  id: string;
  name: string;
  rarity: Rarity;
  archetype: Archetype;
  palette: [string, string, string];
  features?: string[];
  element: Element;
  interval: number;
  mult: number;
  passive: Mod;
  /** 每星級額外倍率 */
  desc: string;
}

// =====================================================================
// 存檔狀態
// =====================================================================

export interface AffixRoll {
  id: string;
  value: number;
  /** 0~1 數值品質 */
  q: number;
  locked?: boolean;
}

export interface Item {
  uid: number;
  slot: ItemSlotKind;
  base: string;
  name: string;
  rarity: Rarity;
  ilvl: number;
  implicit: Mod[];
  affixes: AffixRoll[];
  enh: number;
  unique?: string;
  set?: string;
  locked?: boolean;
  isNew?: boolean;
  /** 打造或掉落當下的職業（武器/副手用） */
  classId?: ClassId;
}

export interface HeroState {
  name: string;
  classId: ClassId;
  advId: AdvId | null;
  level: number;
  xp: number;
  statPoints: number;
  alloc: Record<Primary, number>;
  autoAlloc: boolean;
  skillPoints: number;
  skillRanks: Record<string, number>;
  loadout: (string | null)[];
  talentRanks: Record<string, number>;
  hp: number;
  mp: number;
}

export interface Currencies {
  gold: number;
  gems: number;
  stones: number;
  essence: number;
  shards: number;
  petFood: number;
  protect: number;
  starSouls: number;
  keys: number;
}

export type StageMode = 'push' | 'farm';

export interface Progress {
  difficulty: number;
  stage: number;
  wave: number;
  mode: StageMode;
  /** 各難度已通關的最高關卡索引（-1 = 尚未通關任何關卡） */
  best: number[];
  unlockedDifficulty: number;
}

export interface PetState {
  id: string;
  level: number;
  xp: number;
  stars: number;
  dupes: number;
}

export interface Egg {
  uid: number;
  tier: 0 | 1 | 2;
  readyAt: number | null;
}

export interface MissionState {
  id: string;
  progress: number;
  claimed: boolean;
}

export interface Settings {
  sfx: number;
  music: number;
  particles: 'high' | 'low' | 'off';
  dmgNumbers: boolean;
  shake: boolean;
  numberStyle: 'zh' | 'short' | 'full';
  potionAt: number;
  autoSalvage: number; // 自動分解此稀有度以下（-1 = 關閉）
  keepUpgrades: boolean;
  autoEquip: boolean;
  autoBoss: boolean;
  speedUi: boolean;
}

export interface GameState {
  version: number;
  createdAt: number;
  lastSeen: number;
  playMs: number;
  seed: number;
  nextUid: number;
  hero: HeroState;
  equipment: Record<SlotId, Item | null>;
  inventory: Item[];
  invCapacity: number;
  cur: Currencies;
  potions: [number, number, number];
  progress: Progress;
  dungeons: { date: string; used: Record<string, number>; bought: Record<string, number>; best: Record<string, number> };
  tower: { floor: number; best: number };
  pets: { owned: Record<string, PetState>; active: string | null; eggs: Egg[]; slots: number };
  quests: { main: number; mainProgress: number; daily: MissionState[]; dailyDate: string; dailyChest: boolean };
  achievements: Record<string, number>;
  counters: Record<string, number>;
  codex: Record<string, number>;
  uniquesFound: string[];
  rebirth: { count: number; ranks: Record<string, number>; bestStageEver: number };
  buffs: { id: string; until: number }[];
  merchant: { items: Item[]; refreshAt: number };
  settings: Settings;
  story: string[];
  rate: { xp: number; gold: number; kills: number; samples: number };
}
