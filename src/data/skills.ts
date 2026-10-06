import { flat, inc, more } from '@/core/stats';
import type { SkillDef } from '@/core/types';

const S = (d: SkillDef) => d;

// =====================================================================
// 劍士
// =====================================================================
const warrior: SkillDef[] = [
  S({
    id: 'w_slash', name: '重斬', icon: '🗡️', classId: 'warrior', unlock: 1, mp: [6, 0.5], cd: 4, fx: 'heavy',
    desc: '全力劈砍眼前的敵人，傷口會持續流血。',
    effects: [{ type: 'damage', target: 'front', hits: 1, mult: [1.8, 0.15], dmgType: 'phys', element: 'phys', status: [{ id: 'bleed', chance: 0.35 }] }],
  }),
  S({
    id: 'w_sweep', name: '橫掃', icon: '🌙', classId: 'warrior', unlock: 5, mp: [10, 0.8], cd: 6, fx: 'sweep', cond: 'enemies2',
    desc: '大範圍橫劈，擊中所有敵人。',
    effects: [{ type: 'damage', target: 'all', hits: 1, mult: [1.1, 0.1], dmgType: 'phys', element: 'phys' }],
  }),
  S({
    id: 'w_warcry', name: '戰吼', icon: '📯', classId: 'warrior', unlock: 15, mp: [14, 1], cd: 22, fx: 'buff', cond: 'buffMissing',
    desc: '激昂的吼聲提升攻擊與防禦。',
    effects: [{ type: 'buff', id: 'warcry', name: '戰吼', dur: 12, mods: r => [inc('atk', 20 + 3 * (r - 1)), inc('def', 15 + 2 * (r - 1))] }],
  }),
  S({
    id: 'w_bash', name: '盾擊', icon: '🛡️', classId: 'warrior', unlock: 22, mp: [10, 0.8], cd: 8, fx: 'bash',
    desc: '以盾牌重擊，有機率暈眩敵人並打斷詠唱。',
    effects: [{ type: 'damage', target: 'front', hits: 1, mult: [1.5, 0.12], dmgType: 'phys', element: 'phys', status: [{ id: 'stun', chance: 0.6 }] }],
  }),
  // 狂戰士
  S({
    id: 'b_bloodlust', name: '嗜血', icon: '🩸', classId: 'warrior', advId: 'berserker', unlock: 30, mp: [18, 1], cd: 25, fx: 'buff', cond: 'buffMissing',
    desc: '進入嗜血狀態，攻速與吸血大幅提升。',
    effects: [{ type: 'buff', id: 'bloodlust', name: '嗜血', dur: 12, mods: r => [flat('lifesteal', 6 + 0.8 * (r - 1)), flat('haste', 25 + 3 * (r - 1))] }],
  }),
  S({
    id: 'b_whirl', name: '旋風斬', icon: '🌀', classId: 'warrior', advId: 'berserker', unlock: 40, mp: [22, 1.5], cd: 10, fx: 'whirl',
    desc: '化身旋風連續斬擊所有敵人。',
    effects: [{ type: 'damage', target: 'all', hits: 4, mult: [0.6, 0.06], dmgType: 'phys', element: 'phys', status: [{ id: 'bleed', chance: 0.2 }] }],
  }),
  S({
    id: 'b_ragegod', name: '狂神降臨', icon: '👹', classId: 'warrior', advId: 'berserker', unlock: 60, mp: [40, 2], cd: 60, fx: 'heavy', ultimate: true,
    desc: '解放狂暴之力，重創全場並進入狂神狀態。',
    effects: [
      { type: 'buff', id: 'ragegod', name: '狂神', dur: 15, mods: r => [more('atk', 40 + 4 * (r - 1)), flat('haste', 30)] },
      { type: 'damage', target: 'all', hits: 1, mult: [3, 0.3], dmgType: 'phys', element: 'phys' },
    ],
  }),
  // 聖騎士
  S({
    id: 'p_holyshield', name: '神聖護盾', icon: '🔰', classId: 'warrior', advId: 'paladin', unlock: 30, mp: [16, 1], cd: 18, fx: 'shield',
    desc: '張開晨曦護盾吸收傷害。',
    effects: [{ type: 'shield', pct: [0.22, 0.02], dur: 10 }],
  }),
  S({
    id: 'p_justice', name: '正義之錘', icon: '🔨', classId: 'warrior', advId: 'paladin', unlock: 40, mp: [18, 1.2], cd: 9, fx: 'hammer',
    desc: '召喚光之錘落下，造成神聖傷害並暈眩。',
    effects: [{ type: 'damage', target: 'front', hits: 1, mult: [2.6, 0.22], dmgType: 'phys', element: 'holy', status: [{ id: 'stun', chance: 0.5 }] }],
  }),
  S({
    id: 'p_sanctuary', name: '聖域', icon: '⛪', classId: 'warrior', advId: 'paladin', unlock: 60, mp: [40, 2], cd: 60, fx: 'nova', ultimate: true,
    desc: '展開神聖領域：重創敵人、治療自己並大幅減傷。',
    effects: [
      { type: 'damage', target: 'all', hits: 1, mult: [3.5, 0.3], dmgType: 'phys', element: 'holy' },
      { type: 'heal', pct: [0.3, 0.02] },
      { type: 'buff', id: 'sanctuary', name: '聖域', dur: 12, mods: () => [flat('dmgTaken', -30)] },
    ],
  }),
];

// =====================================================================
// 遊俠
// =====================================================================
const ranger: SkillDef[] = [
  S({
    id: 'r_double', name: '二連射', icon: '🎯', classId: 'ranger', unlock: 1, mp: [5, 0.4], cd: 3, fx: 'arrow',
    desc: '快速射出兩箭。',
    effects: [{ type: 'damage', target: 'front', hits: 2, mult: [0.9, 0.08], dmgType: 'phys', element: 'phys' }],
  }),
  S({
    id: 'r_multi', name: '散射', icon: '🏹', classId: 'ranger', unlock: 5, mp: [9, 0.7], cd: 6, fx: 'multiarrow', cond: 'enemies2',
    desc: '扇形射出箭矢，命中所有敵人。',
    effects: [{ type: 'damage', target: 'all', hits: 1, mult: [1.15, 0.1], dmgType: 'phys', element: 'phys' }],
  }),
  S({
    id: 'r_hawkeye', name: '鷹眼', icon: '🦅', classId: 'ranger', unlock: 15, mp: [12, 1], cd: 20, fx: 'buff', cond: 'buffMissing',
    desc: '專注瞄準，提升暴擊率與暴擊傷害。',
    effects: [{ type: 'buff', id: 'hawkeye', name: '鷹眼', dur: 12, mods: r => [flat('crit', 15 + 1.5 * (r - 1)), flat('critDmg', 30 + 4 * (r - 1))] }],
  }),
  S({
    id: 'r_pierce', name: '穿刺箭', icon: '➶', classId: 'ranger', unlock: 22, mp: [11, 0.8], cd: 8, fx: 'snipe',
    desc: '貫穿護甲的一箭，無視一半防禦。',
    effects: [{ type: 'damage', target: 'front', hits: 1, mult: [3, 0.25], dmgType: 'phys', element: 'phys', pierce: 0.5 }],
  }),
  // 神射手
  S({
    id: 'm_snipe', name: '致命狙擊', icon: '🎯', classId: 'ranger', advId: 'marksman', unlock: 30, mp: [18, 1.2], cd: 12, fx: 'snipe',
    desc: '瞄準血量最高的敵人，暴擊率大幅提升。',
    effects: [{ type: 'damage', target: 'highest', hits: 1, mult: [5, 0.4], dmgType: 'phys', element: 'phys', bonusCrit: 40, pierce: 0.3 }],
  }),
  S({
    id: 'm_rain', name: '箭雨', icon: '🌧️', classId: 'ranger', advId: 'marksman', unlock: 40, mp: [20, 1.4], cd: 10, fx: 'rain',
    desc: '向天空射出箭矢，隨機落在敵人身上。',
    effects: [{ type: 'damage', target: 'random', hits: 8, mult: [0.7, 0.06], dmgType: 'phys', element: 'phys' }],
  }),
  S({
    id: 'm_meteorshot', name: '流星射擊', icon: '🌠', classId: 'ranger', advId: 'marksman', unlock: 60, mp: [40, 2], cd: 50, fx: 'snipe', ultimate: true,
    desc: '凝聚全力的一箭，命中後爆裂波及全場。',
    effects: [
      { type: 'damage', target: 'front', hits: 1, mult: [15, 1.2], dmgType: 'phys', element: 'phys', bonusCrit: 50 },
      { type: 'damage', target: 'all', hits: 1, mult: [4, 0.3], dmgType: 'phys', element: 'phys' },
    ],
  }),
  // 毒影刺客
  S({
    id: 'a_cloud', name: '毒霧', icon: '☠️', classId: 'ranger', advId: 'assassin', unlock: 30, mp: [16, 1], cd: 8, fx: 'poison',
    desc: '散布劇毒煙霧，讓所有敵人中毒。',
    effects: [{ type: 'damage', target: 'all', hits: 1, mult: [0.8, 0.08], dmgType: 'phys', element: 'shadow', status: [{ id: 'poison', chance: 1, stacks: 3 }] }],
  }),
  S({
    id: 'a_shadow', name: '影襲', icon: '🗡️', classId: 'ranger', advId: 'assassin', unlock: 40, mp: [20, 1.2], cd: 9, fx: 'blades',
    desc: '瞬身到敵人身後連續突刺。',
    effects: [{ type: 'damage', target: 'front', hits: 5, mult: [0.8, 0.07], dmgType: 'phys', element: 'phys', status: [{ id: 'bleed', chance: 0.5 }] }],
  }),
  S({
    id: 'a_blades', name: '千刃', icon: '⚔️', classId: 'ranger', advId: 'assassin', unlock: 60, mp: [40, 2], cd: 50, fx: 'blades', ultimate: true,
    desc: '無數暗刃在戰場上飛舞。',
    effects: [{ type: 'damage', target: 'random', hits: 15, mult: [0.9, 0.08], dmgType: 'phys', element: 'shadow', status: [{ id: 'bleed', chance: 0.4 }, { id: 'poison', chance: 0.4 }] }],
  }),
];

// =====================================================================
// 法師
// =====================================================================
const mage: SkillDef[] = [
  S({
    id: 'g_fireball', name: '火球術', icon: '🔥', classId: 'mage', unlock: 1, mp: [8, 0.6], cd: 3, fx: 'fireball',
    desc: '射出熾熱火球，可能點燃敵人。',
    effects: [{ type: 'damage', target: 'front', hits: 1, mult: [2, 0.15], dmgType: 'magic', element: 'fire', status: [{ id: 'burn', chance: 0.4 }] }],
  }),
  S({
    id: 'g_nova', name: '冰霜新星', icon: '❄️', classId: 'mage', unlock: 5, mp: [12, 0.8], cd: 7, fx: 'frost', cond: 'enemies2',
    desc: '寒氣爆發，凍傷所有敵人。',
    effects: [{ type: 'damage', target: 'all', hits: 1, mult: [1.1, 0.1], dmgType: 'magic', element: 'ice', status: [{ id: 'chill', chance: 0.6 }] }],
  }),
  S({
    id: 'g_chain', name: '連鎖閃電', icon: '⚡', classId: 'mage', unlock: 15, mp: [14, 1], cd: 7, fx: 'chain',
    desc: '閃電在敵人之間跳躍。',
    effects: [{ type: 'damage', target: 'random', hits: 4, mult: [1, 0.08], dmgType: 'magic', element: 'lightning', status: [{ id: 'shock', chance: 0.3 }] }],
  }),
  S({
    id: 'g_manashield', name: '魔力護盾', icon: '🔮', classId: 'mage', unlock: 22, mp: [18, 1], cd: 20, fx: 'shield', cond: 'hpBelow70',
    desc: '以魔力形成護盾。',
    effects: [{ type: 'shield', pct: [0.3, 0.02], dur: 12 }],
  }),
  // 元素使
  S({
    id: 'e_meteor', name: '隕石術', icon: '☄️', classId: 'mage', advId: 'elementalist', unlock: 30, mp: [24, 1.5], cd: 12, fx: 'meteor', cast: 0.6,
    desc: '召喚隕石砸向戰場，點燃所有敵人。',
    effects: [{ type: 'damage', target: 'all', hits: 1, mult: [2.8, 0.25], dmgType: 'magic', element: 'fire', status: [{ id: 'burn', chance: 0.8, stacks: 2 }] }],
  }),
  S({
    id: 'e_blizzard', name: '暴風雪', icon: '🌨️', classId: 'mage', advId: 'elementalist', unlock: 40, mp: [26, 1.5], cd: 12, fx: 'blizzard',
    desc: '暴風雪席捲戰場，持續冰凍敵人。',
    effects: [{ type: 'damage', target: 'all', hits: 3, mult: [0.9, 0.08], dmgType: 'magic', element: 'ice', status: [{ id: 'chill', chance: 0.5 }] }],
  }),
  S({
    id: 'e_storm', name: '元素風暴', icon: '🌪️', classId: 'mage', advId: 'elementalist', unlock: 60, mp: [45, 2], cd: 55, fx: 'storm', ultimate: true, cast: 0.8,
    desc: '火、冰、雷三元素同時爆發。',
    effects: [
      { type: 'damage', target: 'all', hits: 1, mult: [2.5, 0.2], dmgType: 'magic', element: 'fire', status: [{ id: 'burn', chance: 1 }] },
      { type: 'damage', target: 'all', hits: 1, mult: [2.5, 0.2], dmgType: 'magic', element: 'ice', status: [{ id: 'chill', chance: 1 }] },
      { type: 'damage', target: 'all', hits: 1, mult: [2.5, 0.2], dmgType: 'magic', element: 'lightning', status: [{ id: 'shock', chance: 1 }] },
    ],
  }),
  // 暗咒師
  S({
    id: 'k_bolt', name: '暗影箭', icon: '🌑', classId: 'mage', advId: 'warlock', unlock: 30, mp: [14, 1], cd: 5, fx: 'shadowbolt',
    desc: '凝聚暗影的魔彈，使敵人中毒。',
    effects: [{ type: 'damage', target: 'front', hits: 1, mult: [3.2, 0.25], dmgType: 'magic', element: 'shadow', status: [{ id: 'poison', chance: 1, stacks: 2 }] }],
  }),
  S({
    id: 'k_skeleton', name: '亡骸召喚', icon: '💀', classId: 'mage', advId: 'warlock', unlock: 40, mp: [25, 1.5], cd: 25, fx: 'summon',
    desc: '喚起骷髏戰士為你作戰 20 秒。',
    effects: [{ type: 'summon', id: 'skeleton', name: '骷髏戰士', dur: 20, interval: 1, mult: [0.8, 0.08], dmgType: 'magic', element: 'shadow', archetype: 'undead' }],
  }),
  S({
    id: 'k_doom', name: '末日審判', icon: '🕳️', classId: 'mage', advId: 'warlock', unlock: 60, mp: [45, 2], cd: 60, fx: 'doom', ultimate: true, cast: 0.8,
    desc: '詛咒全場，接著降下毀滅暗影。',
    effects: [
      { type: 'debuff', target: 'all', status: { id: 'curse', chance: 1 } },
      { type: 'damage', target: 'all', hits: 1, mult: [6, 0.5], dmgType: 'magic', element: 'shadow' },
    ],
  }),
];

// =====================================================================
// 祭司
// =====================================================================
const cleric: SkillDef[] = [
  S({
    id: 'c_bolt', name: '聖光彈', icon: '✨', classId: 'cleric', unlock: 1, mp: [6, 0.5], cd: 3, fx: 'holy',
    desc: '射出聖光，對不死生物特別有效。',
    effects: [{ type: 'damage', target: 'front', hits: 1, mult: [1.8, 0.14], dmgType: 'magic', element: 'holy' }],
  }),
  S({
    id: 'c_heal', name: '治癒術', icon: '💚', classId: 'cleric', unlock: 5, mp: [10, 0.8], cd: 8, fx: 'heal', cond: 'hpBelow70',
    desc: '祈禱恢復生命。',
    effects: [{ type: 'heal', pct: [0.25, 0.02] }],
  }),
  S({
    id: 'c_bless', name: '祝福', icon: '🙏', classId: 'cleric', unlock: 15, mp: [14, 1], cd: 25, fx: 'buff', cond: 'buffMissing',
    desc: '晨曦的祝福提升傷害與防禦。',
    effects: [{ type: 'buff', id: 'bless', name: '祝福', dur: 15, mods: r => [flat('dmg', 20 + 2.5 * (r - 1)), inc('def', 20), inc('res', 20)] }],
  }),
  S({
    id: 'c_nova', name: '神聖新星', icon: '🌟', classId: 'cleric', unlock: 22, mp: [14, 1], cd: 9, fx: 'nova',
    desc: '聖光爆發，傷害所有敵人並治療自己。',
    effects: [
      { type: 'damage', target: 'all', hits: 1, mult: [1.5, 0.12], dmgType: 'magic', element: 'holy' },
      { type: 'heal', pct: [0.08, 0.008] },
    ],
  }),
  // 大主教
  S({
    id: 'h_wings', name: '天使之翼', icon: '🪽', classId: 'cleric', advId: 'archbishop', unlock: 30, mp: [18, 1], cd: 20, fx: 'shield',
    desc: '天使之翼包覆全身，提供護盾與持續回復。',
    effects: [
      { type: 'shield', pct: [0.25, 0.02], dur: 12 },
      { type: 'buff', id: 'wings', name: '天使之翼', dur: 12, mods: r => [inc('hpRegen', 200 + 20 * (r - 1)), flat('hpRegen', 10 + 3 * r)] },
    ],
  }),
  S({
    id: 'h_divine', name: '神聖之光', icon: '☀️', classId: 'cleric', advId: 'archbishop', unlock: 40, mp: [20, 1.4], cd: 10, fx: 'holy',
    desc: '自天而降的三道聖光。',
    effects: [{ type: 'damage', target: 'all', hits: 3, mult: [1.2, 0.1], dmgType: 'magic', element: 'holy' }],
  }),
  S({
    id: 'h_angel', name: '天使降臨', icon: '👼', classId: 'cleric', advId: 'archbishop', unlock: 60, mp: [45, 2], cd: 60, fx: 'nova', ultimate: true,
    desc: '天使降臨戰場：完全治癒，傷害大幅提升。',
    effects: [
      { type: 'heal', pct: [1, 0] },
      { type: 'buff', id: 'angel', name: '天使降臨', dur: 15, mods: r => [more('matk', 35 + 4 * (r - 1)), flat('dmgTaken', -20)] },
      { type: 'damage', target: 'all', hits: 1, mult: [5, 0.4], dmgType: 'magic', element: 'holy' },
    ],
  }),
  // 審判者
  S({
    id: 'q_hammer', name: '聖錘', icon: '🔨', classId: 'cleric', advId: 'inquisitor', unlock: 30, mp: [16, 1], cd: 7, fx: 'hammer',
    desc: '以聖錘重擊，暈眩敵人。',
    effects: [{ type: 'damage', target: 'front', hits: 1, mult: [3.5, 0.28], dmgType: 'magic', element: 'holy', status: [{ id: 'stun', chance: 0.5 }] }],
  }),
  S({
    id: 'q_condemn', name: '制裁', icon: '⚖️', classId: 'cleric', advId: 'inquisitor', unlock: 40, mp: [20, 1.2], cd: 12, fx: 'nova',
    desc: '宣判罪行，削弱所有敵人。',
    effects: [
      { type: 'debuff', target: 'all', status: { id: 'weaken', chance: 1 } },
      { type: 'damage', target: 'all', hits: 1, mult: [2, 0.16], dmgType: 'magic', element: 'holy' },
    ],
  }),
  S({
    id: 'q_wrath', name: '神罰', icon: '⚡', classId: 'cleric', advId: 'inquisitor', unlock: 60, mp: [45, 2], cd: 55, fx: 'storm', ultimate: true,
    desc: '神的怒火化為十道雷霆。',
    effects: [{ type: 'damage', target: 'random', hits: 10, mult: [1.6, 0.13], dmgType: 'magic', element: 'holy', status: [{ id: 'stun', chance: 0.15 }, { id: 'shock', chance: 0.3 }] }],
  }),
];

// =====================================================================
// 怪物技能
// =====================================================================
const enemy: SkillDef[] = [
  S({ id: 'e_bite', name: '撕咬', icon: '🦷', classId: 'enemy', unlock: 1, mp: 0, cd: 6, fx: 'bite', desc: '',
    effects: [{ type: 'damage', target: 'front', hits: 1, mult: 1.6, dmgType: 'phys', element: 'phys', status: [{ id: 'bleed', chance: 0.4 }] }] }),
  S({ id: 'e_poison', name: '毒液', icon: '🧪', classId: 'enemy', unlock: 1, mp: 0, cd: 7, fx: 'spit', desc: '',
    effects: [{ type: 'damage', target: 'front', hits: 1, mult: 1.1, dmgType: 'magic', element: 'shadow', status: [{ id: 'poison', chance: 0.8, stacks: 2 }] }] }),
  S({ id: 'e_fire', name: '火焰吐息', icon: '🔥', classId: 'enemy', unlock: 1, mp: 0, cd: 7, fx: 'breath', desc: '',
    effects: [{ type: 'damage', target: 'front', hits: 1, mult: 1.5, dmgType: 'magic', element: 'fire', status: [{ id: 'burn', chance: 0.5 }] }] }),
  S({ id: 'e_frost', name: '寒冰之觸', icon: '❄️', classId: 'enemy', unlock: 1, mp: 0, cd: 7, fx: 'frost', desc: '',
    effects: [{ type: 'damage', target: 'front', hits: 1, mult: 1.4, dmgType: 'magic', element: 'ice', status: [{ id: 'chill', chance: 0.6 }] }] }),
  S({ id: 'e_shock', name: '電擊', icon: '⚡', classId: 'enemy', unlock: 1, mp: 0, cd: 7, fx: 'chain', desc: '',
    effects: [{ type: 'damage', target: 'front', hits: 1, mult: 1.5, dmgType: 'magic', element: 'lightning', status: [{ id: 'shock', chance: 0.5 }] }] }),
  S({ id: 'e_dark', name: '暗影衝擊', icon: '🌑', classId: 'enemy', unlock: 1, mp: 0, cd: 7, fx: 'shadowbolt', desc: '',
    effects: [{ type: 'damage', target: 'front', hits: 1, mult: 1.6, dmgType: 'magic', element: 'shadow', status: [{ id: 'weaken', chance: 0.3 }] }] }),
  S({ id: 'e_heal', name: '自我修復', icon: '💚', classId: 'enemy', unlock: 1, mp: 0, cd: 12, fx: 'heal', cond: 'hpBelow50', desc: '',
    effects: [{ type: 'heal', pct: 0.15 }] }),
  // 首領
  S({ id: 'boss_slam', name: '蓄力重擊', icon: '💥', classId: 'enemy', unlock: 1, mp: 0, cd: 11, cast: 1.6, fx: 'slam', desc: '詠唱後重擊，可用暈眩打斷。',
    effects: [{ type: 'damage', target: 'front', hits: 1, mult: 3.2, dmgType: 'phys', element: 'phys', status: [{ id: 'stun', chance: 0.6 }] }] }),
  S({ id: 'boss_enrage', name: '狂暴', icon: '😡', classId: 'enemy', unlock: 1, mp: 0, cd: 999, fx: 'buff', cond: 'hpBelow30', desc: '生命低於 30% 時狂暴。',
    effects: [{ type: 'buff', id: 'enrage', name: '狂暴', dur: 999, mods: () => [flat('haste', 50), more('atk', 30), more('matk', 30)] }] }),
  S({ id: 'boss_shield', name: '護盾', icon: '🛡️', classId: 'enemy', unlock: 1, mp: 0, cd: 20, cast: 0.8, fx: 'shield', cond: 'hpBelow70', desc: '展開吸收傷害的護盾。',
    effects: [{ type: 'shield', pct: 0.15, dur: 10 }] }),
  S({ id: 'boss_regen', name: '再生', icon: '🌿', classId: 'enemy', unlock: 1, mp: 0, cd: 16, cast: 1, fx: 'heal', cond: 'hpBelow50', desc: '恢復大量生命，可用暈眩打斷。',
    effects: [{ type: 'heal', pct: 0.12 }] }),
  S({ id: 'boss_firenova', name: '烈焰新星', icon: '🔥', classId: 'enemy', unlock: 1, mp: 0, cd: 12, cast: 1.2, fx: 'nova', desc: '',
    effects: [{ type: 'damage', target: 'front', hits: 1, mult: 2.6, dmgType: 'magic', element: 'fire', status: [{ id: 'burn', chance: 1, stacks: 2 }] }] }),
  S({ id: 'boss_frostbreath', name: '冰霜吐息', icon: '🌬️', classId: 'enemy', unlock: 1, mp: 0, cd: 12, cast: 1.4, fx: 'breath', desc: '',
    effects: [{ type: 'damage', target: 'front', hits: 1, mult: 2.6, dmgType: 'magic', element: 'ice', status: [{ id: 'chill', chance: 1, stacks: 2 }] }] }),
  S({ id: 'boss_thunder', name: '雷霆萬鈞', icon: '🌩️', classId: 'enemy', unlock: 1, mp: 0, cd: 11, cast: 1.2, fx: 'storm', desc: '',
    effects: [{ type: 'damage', target: 'front', hits: 3, mult: 1.1, dmgType: 'magic', element: 'lightning', status: [{ id: 'shock', chance: 0.6 }] }] }),
  S({ id: 'boss_void', name: '虛空吞噬', icon: '🕳️', classId: 'enemy', unlock: 1, mp: 0, cd: 13, cast: 1.5, fx: 'doom', desc: '',
    effects: [{ type: 'damage', target: 'front', hits: 1, mult: 3.4, dmgType: 'magic', element: 'shadow', status: [{ id: 'curse', chance: 0.7 }] }] }),
  S({ id: 'boss_poisoncloud', name: '腐敗孢子', icon: '🍄', classId: 'enemy', unlock: 1, mp: 0, cd: 10, cast: 1, fx: 'poison', desc: '',
    effects: [{ type: 'damage', target: 'front', hits: 1, mult: 1.5, dmgType: 'magic', element: 'shadow', status: [{ id: 'poison', chance: 1, stacks: 4 }] }] }),
  S({ id: 'boss_curse', name: '法老詛咒', icon: '𓂀', classId: 'enemy', unlock: 1, mp: 0, cd: 14, cast: 1, fx: 'doom', desc: '',
    effects: [{ type: 'debuff', target: 'front', status: { id: 'curse', chance: 1 } }, { type: 'damage', target: 'front', hits: 1, mult: 1.8, dmgType: 'magic', element: 'shadow' }] }),
];

/** 首領召喚技能依區域產生（召喚該區的第一種小怪） */
export function summonSkill(monsterId: string): SkillDef {
  return {
    id: 'summon:' + monsterId, name: '呼喚手下', icon: '📣', classId: 'enemy', unlock: 1, mp: 0, cd: 18, cast: 1.2, fx: 'summon', cond: 'enemies2',
    desc: '召喚手下助陣。', effects: [{ type: 'spawn', monster: monsterId, count: 2 }],
  };
}

export const ALL_SKILLS: SkillDef[] = [...warrior, ...ranger, ...mage, ...cleric, ...enemy];
const SKILL_MAP = new Map(ALL_SKILLS.map(s => [s.id, s]));

export function getSkill(id: string): SkillDef {
  if (id.startsWith('summon:')) {
    let s = SKILL_MAP.get(id);
    if (!s) SKILL_MAP.set(id, (s = summonSkill(id.slice(7))));
    return s;
  }
  const s = SKILL_MAP.get(id);
  if (!s) throw new Error('未知技能 ' + id);
  return s;
}

export const classSkills = (classId: string) => ALL_SKILLS.filter(s => s.classId === classId);
export const SKILL_MAX_RANK = 10;
