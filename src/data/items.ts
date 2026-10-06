import { flat, inc } from '@/core/stats';
import type { AffixDef, ClassId, ItemSlotKind, Rarity, SetDef, SlotId, UniqueDef } from '@/core/types';

export const SLOTS: SlotId[] = ['weapon', 'offhand', 'helmet', 'armor', 'gloves', 'belt', 'boots', 'amulet', 'ring1', 'ring2'];
export const slotKind = (s: SlotId): ItemSlotKind => (s === 'ring1' || s === 'ring2' ? 'ring' : s);

export const SLOT_LABEL: Record<ItemSlotKind, string> = {
  weapon: '武器', offhand: '副手', helmet: '頭盔', armor: '盔甲', gloves: '手套',
  belt: '腰帶', boots: '鞋子', amulet: '項鍊', ring: '戒指',
};

export interface RarityDef {
  id: Rarity;
  name: string;
  color: string;
  glow: string;
  affixes: number;
  implicit: number;
}

export const RARITIES: RarityDef[] = [
  { id: 0, name: '普通', color: '#c9ccd3', glow: 'rgba(201,204,211,0)', affixes: 0, implicit: 1 },
  { id: 1, name: '優良', color: '#62d36a', glow: 'rgba(98,211,106,.25)', affixes: 1, implicit: 1.12 },
  { id: 2, name: '稀有', color: '#4aa3ff', glow: 'rgba(74,163,255,.3)', affixes: 2, implicit: 1.25 },
  { id: 3, name: '史詩', color: '#c070ff', glow: 'rgba(192,112,255,.4)', affixes: 3, implicit: 1.4 },
  { id: 4, name: '傳說', color: '#ffa53a', glow: 'rgba(255,165,58,.5)', affixes: 4, implicit: 1.6 },
  { id: 5, name: '神話', color: '#ff4a5a', glow: 'rgba(255,74,90,.6)', affixes: 5, implicit: 1.85 },
];

/** 一般怪 / 精英 / 首領的稀有度權重 */
export const RARITY_WEIGHTS = {
  normal: [1000, 380, 130, 32, 5, 0],
  elite: [300, 500, 320, 110, 18, 0],
  boss: [0, 280, 460, 230, 55, 0],
};

export const TIER_NAMES = ['破舊', '鐵製', '鋼鐵', '騎士', '秘銀', '精靈', '符文', '龍骨', '星辰', '晨曦', '永晝', '神諭', '創世'];
export const tierOf = (ilvl: number) => Math.min(TIER_NAMES.length - 1, Math.floor((ilvl - 1) / 10));

export const WEAPON_NOUN: Record<ClassId, string> = { warrior: '長劍', ranger: '長弓', mage: '法杖', cleric: '戰錘' };
export const OFFHAND_NOUN: Record<ClassId, string> = { warrior: '盾牌', ranger: '箭袋', mage: '魔導珠', cleric: '聖物' };
export const ARMOR_NOUN: Record<Exclude<ItemSlotKind, 'weapon' | 'offhand'>, string> = {
  helmet: '頭盔', armor: '戰甲', gloves: '護手', belt: '腰帶', boots: '長靴', amulet: '項鍊', ring: '戒指',
};

// =====================================================================
// 詞綴
// =====================================================================
const A = (d: AffixDef) => d;
const WEAP: ItemSlotKind[] = ['weapon'];
const JEWEL: ItemSlotKind[] = ['amulet', 'ring'];
const ARMORISH: ItemSlotKind[] = ['helmet', 'armor', 'gloves', 'belt', 'boots'];

export const AFFIXES: AffixDef[] = [
  A({ id: 'atk', stat: 'atk', kind: 'flat', min: 3, max: 6, growth: 0.12, weight: 100, slots: [...WEAP, 'gloves', 'offhand', ...JEWEL] }),
  A({ id: 'matk', stat: 'matk', kind: 'flat', min: 3, max: 6, growth: 0.12, weight: 100, slots: [...WEAP, 'gloves', 'offhand', ...JEWEL] }),
  A({ id: 'atkPct', stat: 'atk', kind: 'inc', min: 4, max: 8, growth: 0.006, weight: 40, slots: [...WEAP, 'gloves', 'amulet'], minIlvl: 8 }),
  A({ id: 'matkPct', stat: 'matk', kind: 'inc', min: 4, max: 8, growth: 0.006, weight: 40, slots: [...WEAP, 'offhand', 'amulet'], minIlvl: 8 }),
  A({ id: 'str', stat: 'str', kind: 'flat', min: 2, max: 4, growth: 0.1, weight: 70, slots: 'all' }),
  A({ id: 'dex', stat: 'dex', kind: 'flat', min: 2, max: 4, growth: 0.1, weight: 70, slots: 'all' }),
  A({ id: 'int', stat: 'int', kind: 'flat', min: 2, max: 4, growth: 0.1, weight: 70, slots: 'all' }),
  A({ id: 'vit', stat: 'vit', kind: 'flat', min: 2, max: 4, growth: 0.1, weight: 70, slots: 'all' }),
  A({ id: 'allStats', stat: 'allStats', kind: 'flat', min: 1, max: 2, growth: 0.08, weight: 25, slots: JEWEL, minIlvl: 10 }),
  A({ id: 'hp', stat: 'hp', kind: 'flat', min: 12, max: 24, growth: 0.12, weight: 100, slots: [...ARMORISH, 'offhand', 'amulet'] }),
  A({ id: 'hpPct', stat: 'hp', kind: 'inc', min: 3, max: 6, growth: 0.005, weight: 45, slots: ['armor', 'belt', 'amulet', 'offhand'], minIlvl: 5 }),
  A({ id: 'def', stat: 'def', kind: 'flat', min: 4, max: 8, growth: 0.1, weight: 80, slots: [...ARMORISH, 'offhand'] }),
  A({ id: 'res', stat: 'res', kind: 'flat', min: 3, max: 6, growth: 0.1, weight: 60, slots: [...ARMORISH, 'offhand'] }),
  A({ id: 'eva', stat: 'eva', kind: 'flat', min: 4, max: 8, growth: 0.1, weight: 45, slots: ['boots', 'gloves', 'armor', 'helmet'] }),
  A({ id: 'crit', stat: 'crit', kind: 'flat', min: 1.5, max: 3, growth: 0.004, weight: 50, slots: [...WEAP, 'gloves', 'helmet', 'offhand', ...JEWEL] }),
  A({ id: 'critDmg', stat: 'critDmg', kind: 'flat', min: 6, max: 12, growth: 0.006, weight: 45, slots: [...WEAP, 'gloves', ...JEWEL] }),
  A({ id: 'haste', stat: 'haste', kind: 'flat', min: 2, max: 4, growth: 0.003, weight: 40, slots: [...WEAP, 'gloves', 'offhand', 'ring'] }),
  A({ id: 'cdr', stat: 'cdr', kind: 'flat', min: 2, max: 4, growth: 0.002, weight: 25, slots: ['helmet', 'amulet', 'offhand'], minIlvl: 12 }),
  A({ id: 'lifesteal', stat: 'lifesteal', kind: 'flat', min: 0.5, max: 1.2, growth: 0.002, weight: 20, slots: [...WEAP, ...JEWEL], minIlvl: 10 }),
  A({ id: 'hpRegen', stat: 'hpRegen', kind: 'flat', min: 1.5, max: 3, growth: 0.12, weight: 40, slots: ['armor', 'belt', 'helmet', 'amulet'] }),
  A({ id: 'mpRegen', stat: 'mpRegen', kind: 'flat', min: 0.3, max: 0.7, growth: 0.03, weight: 30, slots: ['helmet', 'amulet', 'offhand', 'ring'] }),
  A({ id: 'dmg', stat: 'dmg', kind: 'flat', min: 3, max: 6, growth: 0.006, weight: 30, slots: [...WEAP, ...JEWEL], minIlvl: 15 }),
  A({ id: 'physDmg', stat: 'physDmg', kind: 'flat', min: 5, max: 9, growth: 0.008, weight: 40, slots: [...WEAP, 'gloves', 'offhand', 'amulet'] }),
  A({ id: 'magDmg', stat: 'magDmg', kind: 'flat', min: 5, max: 9, growth: 0.008, weight: 40, slots: [...WEAP, 'gloves', 'offhand', 'amulet'] }),
  A({ id: 'fireDmg', stat: 'fireDmg', kind: 'flat', min: 6, max: 11, growth: 0.008, weight: 22, slots: [...WEAP, 'offhand', 'gloves', ...JEWEL] }),
  A({ id: 'iceDmg', stat: 'iceDmg', kind: 'flat', min: 6, max: 11, growth: 0.008, weight: 22, slots: [...WEAP, 'offhand', 'gloves', ...JEWEL] }),
  A({ id: 'lightningDmg', stat: 'lightningDmg', kind: 'flat', min: 6, max: 11, growth: 0.008, weight: 22, slots: [...WEAP, 'offhand', 'gloves', ...JEWEL] }),
  A({ id: 'holyDmg', stat: 'holyDmg', kind: 'flat', min: 6, max: 11, growth: 0.008, weight: 22, slots: [...WEAP, 'offhand', 'gloves', ...JEWEL] }),
  A({ id: 'shadowDmg', stat: 'shadowDmg', kind: 'flat', min: 6, max: 11, growth: 0.008, weight: 22, slots: [...WEAP, 'offhand', 'gloves', ...JEWEL] }),
  A({ id: 'skillDmg', stat: 'skillDmg', kind: 'flat', min: 5, max: 10, growth: 0.007, weight: 25, slots: ['helmet', 'amulet', 'offhand', ...WEAP], minIlvl: 15 }),
  A({ id: 'bossDmg', stat: 'bossDmg', kind: 'flat', min: 5, max: 10, growth: 0.008, weight: 20, slots: [...WEAP, ...JEWEL, 'gloves'], minIlvl: 20 }),
  A({ id: 'dotDmg', stat: 'dotDmg', kind: 'flat', min: 8, max: 14, growth: 0.008, weight: 15, slots: [...WEAP, 'gloves', 'ring'], minIlvl: 20 }),
  A({ id: 'dmgTaken', stat: 'dmgTaken', kind: 'flat', min: -4, max: -2, growth: 0.003, weight: 15, slots: ['armor', 'belt', 'offhand'], minIlvl: 25 }),
  A({ id: 'fireRes', stat: 'fireRes', kind: 'flat', min: 6, max: 12, growth: 0.004, weight: 25, slots: [...ARMORISH, 'offhand', 'ring'] }),
  A({ id: 'iceRes', stat: 'iceRes', kind: 'flat', min: 6, max: 12, growth: 0.004, weight: 25, slots: [...ARMORISH, 'offhand', 'ring'] }),
  A({ id: 'lightningRes', stat: 'lightningRes', kind: 'flat', min: 6, max: 12, growth: 0.004, weight: 25, slots: [...ARMORISH, 'offhand', 'ring'] }),
  A({ id: 'shadowRes', stat: 'shadowRes', kind: 'flat', min: 6, max: 12, growth: 0.004, weight: 25, slots: [...ARMORISH, 'offhand', 'ring'] }),
  A({ id: 'statusChance', stat: 'statusChance', kind: 'flat', min: 4, max: 8, growth: 0.004, weight: 15, slots: [...WEAP, 'gloves', 'amulet'], minIlvl: 15 }),
  A({ id: 'healPower', stat: 'healPower', kind: 'flat', min: 5, max: 10, growth: 0.005, weight: 12, slots: ['offhand', 'armor', 'amulet'] }),
  A({ id: 'petDmg', stat: 'petDmg', kind: 'flat', min: 8, max: 15, growth: 0.006, weight: 15, slots: ['amulet', 'ring', 'belt'] }),
  A({ id: 'goldFind', stat: 'goldFind', kind: 'flat', min: 5, max: 12, growth: 0.006, weight: 25, slots: ['helmet', 'gloves', 'boots', 'belt', ...JEWEL] }),
  A({ id: 'xpGain', stat: 'xpGain', kind: 'flat', min: 3, max: 7, growth: 0.004, weight: 20, slots: ['helmet', ...JEWEL] }),
  A({ id: 'magicFind', stat: 'magicFind', kind: 'flat', min: 4, max: 9, growth: 0.005, weight: 20, slots: ['helmet', 'boots', ...JEWEL] }),
];

export const AFFIX_MAP = new Map(AFFIXES.map(a => [a.id, a]));

// =====================================================================
// 傳說裝備（特殊能力實作在 systems/powers.ts）
// =====================================================================
const U = (d: UniqueDef) => d;

export const UNIQUES: UniqueDef[] = [
  U({ id: 'u_thunderblade', name: '雷鳴之刃', slot: 'weapon', classId: 'warrior', minIlvl: 15, affixes: [{ id: 'atkPct' }, { id: 'lightningDmg', mult: 1.5 }, { id: 'haste' }], power: { id: 'chainOnHit', value: 15 }, flavor: '劍身上的雷紋會在揮砍時甦醒。' }),
  U({ id: 'u_executioner', name: '處刑者', slot: 'weapon', classId: 'warrior', minIlvl: 30, affixes: [{ id: 'atk', mult: 1.3 }, { id: 'critDmg', mult: 1.5 }, { id: 'bossDmg' }], power: { id: 'executioner', value: 60 }, flavor: '它只認得將死之人。' }),
  U({ id: 'u_bloodmoon', name: '血月', slot: 'weapon', classId: 'warrior', minIlvl: 45, affixes: [{ id: 'atkPct', mult: 1.2 }, { id: 'dotDmg', mult: 1.5 }, { id: 'lifesteal' }], power: { id: 'bleedBurst', value: 250 }, flavor: '紅月升起的夜晚鍛造。' }),
  U({ id: 'u_windpiercer', name: '穿風者', slot: 'weapon', classId: 'ranger', minIlvl: 15, affixes: [{ id: 'atkPct' }, { id: 'crit', mult: 1.5 }, { id: 'haste' }], power: { id: 'evadeCrit', value: 100 }, flavor: '箭還沒離弦，風已經先到了。' }),
  U({ id: 'u_starfall_bow', name: '星墜長弓', slot: 'weapon', classId: 'ranger', minIlvl: 40, affixes: [{ id: 'atk', mult: 1.3 }, { id: 'critDmg', mult: 1.4 }, { id: 'skillDmg' }], power: { id: 'starfall', value: 300 }, flavor: '每一顆流星都是一支沒射完的箭。' }),
  U({ id: 'u_frostwhisper', name: '霜語', slot: 'weapon', classId: 'mage', minIlvl: 15, affixes: [{ id: 'matkPct' }, { id: 'iceDmg', mult: 1.6 }, { id: 'cdr' }], power: { id: 'frostCrit', value: 30 }, flavor: '握著它的手永遠是冰冷的。' }),
  U({ id: 'u_starfall_staff', name: '星墜法杖', slot: 'weapon', classId: 'mage', minIlvl: 40, affixes: [{ id: 'matk', mult: 1.3 }, { id: 'magDmg', mult: 1.3 }, { id: 'skillDmg' }], power: { id: 'starfall', value: 350 }, flavor: '把天空裝進了杖頭。' }),
  U({ id: 'u_dawnhammer', name: '晨曦審判', slot: 'weapon', classId: 'cleric', minIlvl: 15, affixes: [{ id: 'matkPct' }, { id: 'holyDmg', mult: 1.6 }, { id: 'healPower' }], power: { id: 'holyNova', value: 120 }, flavor: '每第五下，晨曦就會回應。' }),
  U({ id: 'u_sunbreaker', name: '碎日者', slot: 'weapon', classId: 'cleric', minIlvl: 45, affixes: [{ id: 'matk', mult: 1.3 }, { id: 'critDmg', mult: 1.3 }, { id: 'bossDmg' }], power: { id: 'executioner', value: 50 }, flavor: '連太陽都能擊碎的錘。' }),
  U({ id: 'u_aegis', name: '守護者之盾', slot: 'offhand', classId: 'warrior', minIlvl: 20, affixes: [{ id: 'hpPct', mult: 1.5 }, { id: 'def', mult: 1.3 }, { id: 'dmgTaken' }], power: { id: 'guardian', value: 35 }, flavor: '它擋下過一頭龍的吐息。' }),
  U({ id: 'u_thousand', name: '千羽箭袋', slot: 'offhand', classId: 'ranger', minIlvl: 20, affixes: [{ id: 'atk' }, { id: 'haste', mult: 1.3 }, { id: 'crit' }], power: { id: 'multishot', value: 1 }, flavor: '裡面的箭好像永遠用不完。' }),
  U({ id: 'u_burningheart', name: '焚世之心', slot: 'offhand', classId: 'mage', minIlvl: 25, affixes: [{ id: 'fireDmg', mult: 1.6 }, { id: 'matk' }, { id: 'statusChance' }], power: { id: 'burnAmp', value: 25 }, flavor: '一顆仍在跳動的火焰之心。' }),
  U({ id: 'u_dawnrelic', name: '晨曦碎片', slot: 'offhand', classId: 'cleric', minIlvl: 25, affixes: [{ id: 'healPower', mult: 1.5 }, { id: 'holyDmg' }, { id: 'hpPct' }], power: { id: 'phoenix', value: 50 }, flavor: '永晝水晶的一小塊，溫暖而明亮。' }),
  U({ id: 'u_arcaneeye', name: '奧術之眼', slot: 'helmet', minIlvl: 20, affixes: [{ id: 'cdr', mult: 1.5 }, { id: 'mpRegen', mult: 2 }, { id: 'skillDmg' }], power: { id: 'echo', value: 15 }, flavor: '看得見魔力的流動。' }),
  U({ id: 'u_stormcrown', name: '雷霆之冠', slot: 'helmet', minIlvl: 45, affixes: [{ id: 'lightningDmg', mult: 1.5 }, { id: 'crit' }, { id: 'hp' }], power: { id: 'overload', value: 80 }, flavor: '戴上它，頭髮會一直豎起來。' }),
  U({ id: 'u_thornmail', name: '荊棘之鎧', slot: 'armor', minIlvl: 15, affixes: [{ id: 'def', mult: 1.5 }, { id: 'hp', mult: 1.3 }, { id: 'vit' }], power: { id: 'thorns', value: 40 }, flavor: '擁抱它的人會後悔。' }),
  U({ id: 'u_vampcloak', name: '血族長袍', slot: 'armor', minIlvl: 35, affixes: [{ id: 'hpPct' }, { id: 'lifesteal', mult: 1.5 }, { id: 'shadowDmg' }], power: { id: 'killHeal', value: 8 }, flavor: '布料是用月光染紅的。' }),
  U({ id: 'u_midas', name: '邁達斯之手', slot: 'gloves', minIlvl: 10, affixes: [{ id: 'goldFind', mult: 2 }, { id: 'crit' }, { id: 'atk' }], power: { id: 'goldTouch', value: 20 }, flavor: '摸過的東西都會閃閃發光。' }),
  U({ id: 'u_firststrike', name: '先制拳套', slot: 'gloves', minIlvl: 30, affixes: [{ id: 'critDmg' }, { id: 'haste' }, { id: 'physDmg' }], power: { id: 'firstStrike', value: 100 }, flavor: '最好的防守是讓對方沒機會出手。' }),
  U({ id: 'u_furybelt', name: '狂怒腰帶', slot: 'belt', minIlvl: 25, affixes: [{ id: 'hp', mult: 1.5 }, { id: 'str' }, { id: 'hpRegen' }], power: { id: 'berserk', value: 4 }, flavor: '越痛越強。' }),
  U({ id: 'u_hourglass', name: '時之沙漏', slot: 'belt', minIlvl: 40, affixes: [{ id: 'cdr' }, { id: 'hpPct' }, { id: 'skillDmg' }], power: { id: 'timeWarp', value: 0.5 }, flavor: '沙子往上流。' }),
  U({ id: 'u_windwalker', name: '風行者之靴', slot: 'boots', minIlvl: 15, affixes: [{ id: 'eva', mult: 1.6 }, { id: 'dex' }, { id: 'magicFind' }], power: { id: 'swift', value: 15 }, flavor: '走路不會留下腳印。' }),
  U({ id: 'u_phoenix', name: '不死鳥之羽', slot: 'amulet', minIlvl: 30, affixes: [{ id: 'allStats', mult: 1.5 }, { id: 'hpPct' }, { id: 'fireRes' }], power: { id: 'phoenix', value: 60 }, flavor: '浴火重生。' }),
  U({ id: 'u_deathmark', name: '死神印記', slot: 'amulet', minIlvl: 40, affixes: [{ id: 'dotDmg', mult: 1.5 }, { id: 'shadowDmg' }, { id: 'statusChance' }], power: { id: 'deathMark', value: 35 }, flavor: '被標記的靈魂逃不掉。' }),
  U({ id: 'u_greed', name: '貪婪者指環', slot: 'ring', minIlvl: 10, affixes: [{ id: 'goldFind', mult: 2.5 }, { id: 'magicFind', mult: 2 }], power: { id: 'greed', value: 15 }, flavor: '想要更多，永遠更多。' }),
  U({ id: 'u_echo', name: '回音之戒', slot: 'ring', minIlvl: 35, affixes: [{ id: 'skillDmg', mult: 1.3 }, { id: 'cdr' }, { id: 'critDmg' }], power: { id: 'echo', value: 20 }, flavor: '每一句咒語都會被重複一次。' }),
  U({ id: 'u_beastbond', name: '馴獸師之戒', slot: 'ring', minIlvl: 20, affixes: [{ id: 'petDmg', mult: 2 }, { id: 'hp' }, { id: 'vit' }], power: { id: 'petBond', value: 50 }, flavor: '動物們都喜歡戴著它的人。' }),
];
export const UNIQUE_MAP = new Map(UNIQUES.map(u => [u.id, u]));

// =====================================================================
// 套裝
// =====================================================================
export const SETS: SetDef[] = [
  {
    id: 's_guardian', name: '晨曦守護者', classId: 'warrior',
    pieces: [{ slot: 'helmet', name: '守護者頭盔' }, { slot: 'armor', name: '守護者胸甲' }, { slot: 'gloves', name: '守護者臂甲' }, { slot: 'boots', name: '守護者戰靴' }],
    bonus2: [inc('hp', 15), inc('def', 15)],
    bonus4: { mods: [inc('atk', 25)], power: { id: 'guardian', value: 30 } },
  },
  {
    id: 's_hunter', name: '林風獵人', classId: 'ranger',
    pieces: [{ slot: 'helmet', name: '獵人兜帽' }, { slot: 'gloves', name: '獵人手套' }, { slot: 'boots', name: '獵人長靴' }, { slot: 'offhand', name: '獵人箭袋' }],
    bonus2: [flat('haste', 10), flat('crit', 5)],
    bonus4: { mods: [flat('critDmg', 40)], power: { id: 'multishot', value: 2 } },
  },
  {
    id: 's_sage', name: '奧術賢者', classId: 'mage',
    pieces: [{ slot: 'helmet', name: '賢者之冠' }, { slot: 'armor', name: '賢者法袍' }, { slot: 'offhand', name: '賢者之珠' }, { slot: 'amulet', name: '賢者項鍊' }],
    bonus2: [flat('magDmg', 15), inc('mp', 25)],
    bonus4: { mods: [flat('cdr', 10)], power: { id: 'echo', value: 20 } },
  },
  {
    id: 's_apostle', name: '聖光使徒', classId: 'cleric',
    pieces: [{ slot: 'helmet', name: '使徒頭冠' }, { slot: 'armor', name: '使徒聖袍' }, { slot: 'offhand', name: '使徒聖典' }, { slot: 'belt', name: '使徒腰帶' }],
    bonus2: [flat('healPower', 20), flat('holyDmg', 15)],
    bonus4: { mods: [inc('matk', 20)], power: { id: 'holyNova', value: 150 } },
  },
  {
    id: 's_traveler', name: '旅人之心',
    pieces: [{ slot: 'belt', name: '旅人腰帶' }, { slot: 'boots', name: '旅人之靴' }, { slot: 'ring', name: '旅人指環' }, { slot: 'amulet', name: '旅人護符' }],
    bonus2: [flat('xpGain', 15), flat('goldFind', 20)],
    bonus4: { mods: [flat('magicFind', 30)], power: { id: 'timeWarp', value: 0.4 } },
  },
  {
    id: 's_devourer', name: '暮影吞噬者',
    pieces: [{ slot: 'weapon', name: '吞噬者之牙' }, { slot: 'armor', name: '吞噬者外殼' }, { slot: 'ring', name: '吞噬者之環' }, { slot: 'amulet', name: '吞噬者之心' }],
    bonus2: [flat('shadowDmg', 20), flat('dmg', 10)],
    bonus4: { mods: [flat('lifesteal', 3)], power: { id: 'deathMark', value: 30 } },
  },
];
export const SET_MAP = new Map(SETS.map(s => [s.id, s]));
