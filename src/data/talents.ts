import { describeMod, flat, inc, more, type Mod } from '@/core/stats';
import type { ClassId, TalentNode, TalentTree } from '@/core/types';
import { describePower } from './powers';

/** 以 mod 為主的天賦節點：說明文字自動產生 */
function modNode(id: string, name: string, icon: string, tier: number, col: number, maxRank: number, mods: (r: number) => Mod[]): TalentNode {
  return { id, name, icon, tier, col, maxRank, mods, desc: r => mods(Math.max(1, r)).map(m => describeMod(m, 1)).join('、') };
}
function powerNode(id: string, name: string, icon: string, tier: number, col: number, maxRank: number, power: string, per: number): TalentNode {
  return { id, name, icon, tier, col, maxRank, power: { id: power, value: r => per * r }, desc: r => describePower(power, per * Math.max(1, r)) };
}

const tree = (classId: ClassId, nodes: TalentNode[]): TalentTree => ({ classId, nodes });

export const TALENT_TREES: Record<ClassId, TalentTree> = {
  warrior: tree('warrior', [
    modNode('w0a', '力量訓練', '💪', 0, 0, 5, r => [inc('atk', 3 * r)]),
    modNode('w0b', '強韌體魄', '❤️', 0, 1, 5, r => [inc('hp', 4 * r)]),
    modNode('w0c', '戰鬥直覺', '👁️', 0, 2, 5, r => [flat('crit', 1 * r)]),
    modNode('w1a', '撕裂', '🩸', 1, 0, 5, r => [flat('dotDmg', 8 * r), flat('statusChance', 2 * r)]),
    modNode('w1b', '鋼鐵皮膚', '🛡️', 1, 1, 5, r => [inc('def', 6 * r)]),
    modNode('w1c', '怒氣回流', '🔄', 1, 2, 5, r => [flat('mpRegen', 0.4 * r)]),
    modNode('w2a', '武器專精', '⚔️', 2, 0, 5, r => [flat('physDmg', 5 * r)]),
    modNode('w2b', '堅守', '🏰', 2, 1, 5, r => [flat('dmgTaken', -2 * r)]),
    modNode('w2c', '迅捷', '💨', 2, 2, 5, r => [flat('haste', 3 * r)]),
    modNode('w3a', '斬首', '🪓', 3, 0, 5, r => [flat('bossDmg', 6 * r)]),
    modNode('w3b', '再生', '🌿', 3, 1, 5, r => [inc('hpRegen', 20 * r), flat('hpRegen', 3 * r)]),
    modNode('w3c', '戰術大師', '📜', 3, 2, 5, r => [flat('cdr', 2 * r)]),
    modNode('w4a', '嗜血本能', '🧛', 4, 0, 3, r => [flat('lifesteal', 1 * r)]),
    powerNode('w4b', '不屈', '🔰', 4, 1, 3, 'guardian', 10),
    powerNode('w4c', '處決', '☠️', 4, 2, 3, 'executioner', 15),
    modNode('w5a', '戰神', '👑', 5, 0, 1, () => [more('atk', 15)]),
    powerNode('w5b', '不朽', '🔥', 5, 1, 1, 'phoenix', 40),
    powerNode('w5c', '狂怒', '😤', 5, 2, 1, 'berserk', 3),
  ]),
  ranger: tree('ranger', [
    modNode('r0a', '精準', '🎯', 0, 0, 5, r => [inc('atk', 3 * r)]),
    modNode('r0b', '敏捷身手', '🍃', 0, 1, 5, r => [inc('eva', 8 * r)]),
    modNode('r0c', '銳眼', '🦅', 0, 2, 5, r => [flat('crit', 1.2 * r)]),
    modNode('r1a', '致命', '💀', 1, 0, 5, r => [flat('critDmg', 6 * r)]),
    modNode('r1b', '輕裝', '🧥', 1, 1, 5, r => [inc('hp', 3 * r)]),
    modNode('r1c', '專注', '🧘', 1, 2, 5, r => [flat('mpRegen', 0.4 * r)]),
    modNode('r2a', '弓術專精', '🏹', 2, 0, 5, r => [flat('physDmg', 5 * r)]),
    modNode('r2b', '閃避本能', '👟', 2, 1, 5, r => [inc('eva', 8 * r), inc('hp', 2 * r)]),
    modNode('r2c', '連射', '⚡', 2, 2, 5, r => [flat('haste', 3 * r)]),
    modNode('r3a', '獵殺', '🐺', 3, 0, 5, r => [flat('bossDmg', 6 * r)]),
    modNode('r3b', '毒素研究', '🧪', 3, 1, 5, r => [flat('dotDmg', 8 * r), flat('statusChance', 3 * r)]),
    modNode('r3c', '戰術', '🗺️', 3, 2, 5, r => [flat('cdr', 2 * r)]),
    modNode('r4a', '穿雲', '☁️', 4, 0, 3, r => [flat('critDmg', 12 * r)]),
    powerNode('r4b', '疾風', '🌪️', 4, 1, 3, 'swift', 8),
    powerNode('r4c', '死神印記', '🕸️', 4, 2, 3, 'deathMark', 10),
    modNode('r5a', '神射', '👑', 5, 0, 1, () => [more('atk', 15)]),
    powerNode('r5b', '幻影', '👤', 5, 1, 1, 'evadeCrit', 100),
    powerNode('r5c', '千羽', '🪶', 5, 2, 1, 'multishot', 1),
  ]),
  mage: tree('mage', [
    modNode('m0a', '奧術智慧', '📘', 0, 0, 5, r => [inc('matk', 3 * r)]),
    modNode('m0b', '魔力湧泉', '💧', 0, 1, 5, r => [inc('mp', 6 * r), inc('hp', 2 * r)]),
    modNode('m0c', '元素親和', '🔮', 0, 2, 5, r => [flat('crit', 1 * r)]),
    modNode('m1a', '烈焰', '🔥', 1, 0, 5, r => [flat('fireDmg', 6 * r)]),
    modNode('m1b', '寒霜', '❄️', 1, 1, 5, r => [flat('iceDmg', 6 * r)]),
    modNode('m1c', '雷霆', '⚡', 1, 2, 5, r => [flat('lightningDmg', 6 * r)]),
    modNode('m2a', '法術專精', '✨', 2, 0, 5, r => [flat('magDmg', 5 * r)]),
    modNode('m2b', '魔力護體', '🛡️', 2, 1, 5, r => [inc('hp', 4 * r), inc('res', 5 * r)]),
    modNode('m2c', '冥想', '🧘', 2, 2, 5, r => [flat('mpRegen', 0.5 * r)]),
    modNode('m3a', '元素掌控', '🌈', 3, 0, 5, r => [flat('statusChance', 4 * r)]),
    modNode('m3b', '法術迴響', '🔁', 3, 1, 5, r => [flat('cdr', 2 * r)]),
    modNode('m3c', '毀滅', '💥', 3, 2, 5, r => [flat('skillDmg', 6 * r)]),
    powerNode('m4a', '焚燒', '🌋', 4, 0, 3, 'burnAmp', 8),
    powerNode('m4b', '霜咬', '🧊', 4, 1, 3, 'frostCrit', 8),
    powerNode('m4c', '超載', '🌩️', 4, 2, 3, 'overload', 25),
    modNode('m5a', '大法師', '👑', 5, 0, 1, () => [more('matk', 15)]),
    powerNode('m5b', '回音', '🔊', 5, 1, 1, 'echo', 15),
    powerNode('m5c', '星墜', '🌠', 5, 2, 1, 'starfall', 250),
  ]),
  cleric: tree('cleric', [
    modNode('c0a', '虔誠', '🙏', 0, 0, 5, r => [inc('matk', 3 * r)]),
    modNode('c0b', '堅定信仰', '❤️', 0, 1, 5, r => [inc('hp', 4 * r)]),
    modNode('c0c', '神恩', '💚', 0, 2, 5, r => [flat('healPower', 5 * r)]),
    modNode('c1a', '聖光', '☀️', 1, 0, 5, r => [flat('holyDmg', 6 * r)]),
    modNode('c1b', '庇護', '⛪', 1, 1, 5, r => [inc('def', 5 * r), inc('res', 5 * r)]),
    modNode('c1c', '祈禱', '📿', 1, 2, 5, r => [flat('mpRegen', 0.4 * r)]),
    modNode('c2a', '審判', '⚖️', 2, 0, 5, r => [flat('magDmg', 5 * r)]),
    modNode('c2b', '神聖護佑', '🕊️', 2, 1, 5, r => [flat('dmgTaken', -2 * r)]),
    modNode('c2c', '加持', '🔆', 2, 2, 5, r => [flat('shieldPower', 6 * r)]),
    modNode('c3a', '懲戒', '🔨', 3, 0, 5, r => [flat('bossDmg', 6 * r)]),
    modNode('c3b', '恩典', '🌸', 3, 1, 5, r => [flat('healPower', 8 * r)]),
    modNode('c3c', '沉思', '📖', 3, 2, 5, r => [flat('cdr', 2 * r)]),
    powerNode('c4a', '新星', '🌟', 4, 0, 3, 'holyNova', 40),
    powerNode('c4b', '守護天使', '👼', 4, 1, 3, 'guardian', 10),
    powerNode('c4c', '制裁', '⚔️', 4, 2, 3, 'executioner', 15),
    modNode('c5a', '神之化身', '👑', 5, 0, 1, () => [more('matk', 15)]),
    powerNode('c5b', '復活', '🪶', 5, 1, 1, 'phoenix', 50),
    powerNode('c5c', '光輝', '💫', 5, 2, 1, 'killHeal', 5),
  ]),
};

/** 該層需要在整棵樹投入多少點才能解鎖 */
export const TALENT_TIER_REQ = [0, 3, 7, 12, 18, 25];
/** 這些層只能選一個節點（終極取捨，參考 WoW 熊貓人版的多選一天賦） */
export const EXCLUSIVE_TIERS = [4, 5];
