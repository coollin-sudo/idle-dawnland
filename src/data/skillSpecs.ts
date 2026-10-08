import type { Scaling, SkillDef, SkillEffect, StatusApply } from '@/core/types';

/**
 * 技能專精：技能達到 SPEC_RANK 後，從兩種專精中選一種，改變技能的運作方式
 * （參考 Last Epoch 的技能專精與 Diablo III 的技能符文）。
 * 專精以「通用改造模板」組合而成，大致維持強度相近但適合的情境不同，可隨時免費切換。
 */
export const SPEC_RANK = 5;

export interface SkillSpec {
  name: string;
  desc: string;
  apply: (def: SkillDef) => SkillDef;
}

// ---------------------------------------------------------------------
// 改造工具
// ---------------------------------------------------------------------
const mul = (s: Scaling, k: number): Scaling => (typeof s === 'number' ? s * k : [s[0] * k, s[1] * k] as const);
type Dmg = Extract<SkillEffect, { type: 'damage' }>;
const mapDmg = (def: SkillDef, fn: (e: Dmg) => Dmg): SkillDef => ({ ...def, effects: def.effects.map(e => (e.type === 'damage' ? fn(e) : e)) });
const mapType = <T extends SkillEffect['type']>(def: SkillDef, type: T, fn: (e: Extract<SkillEffect, { type: T }>) => SkillEffect): SkillDef =>
  ({ ...def, effects: def.effects.map(e => (e.type === type ? fn(e as Extract<SkillEffect, { type: T }>) : e)) });
const withStatus = (e: Dmg, id: StatusApply['id'], add: number): Dmg => {
  const list = [...(e.status ?? [])];
  const i = list.findIndex(s => s.id === id);
  if (i >= 0) list[i] = { ...list[i], chance: Math.min(1, list[i].chance + add) };
  else list.push({ id, chance: Math.min(1, add) });
  return { ...e, status: list };
};

// ---------------------------------------------------------------------
// 通用模板
// ---------------------------------------------------------------------
const T = {
  /** 擴散：單體變全體，單發較弱 */
  spread: (name: string): SkillSpec => ({
    name, desc: '改為攻擊全部敵人，傷害 ×0.55',
    apply: d => mapDmg(d, e => ({ ...e, target: 'all', mult: mul(e.mult, 0.55) })),
  }),
  /** 連發：次數加倍、每下較弱（觸發異常與吸血的次數更多） */
  barrage: (name: string): SkillSpec => ({
    name, desc: '攻擊次數 ×2，每下傷害 ×0.6（更容易觸發異常）',
    apply: d => mapDmg(d, e => ({ ...e, hits: e.hits * 2, mult: mul(e.mult, 0.6) })),
  }),
  /** 重擊：冷卻變長、單發極重 */
  heavy: (name: string): SkillSpec => ({
    name, desc: '傷害 ×1.9，冷卻 ×1.6',
    apply: d => ({ ...mapDmg(d, e => ({ ...e, mult: mul(e.mult, 1.9) })), cd: d.cd * 1.6 }),
  }),
  /** 迅捷：冷卻縮短、傷害降低 */
  swift: (name: string): SkillSpec => ({
    name, desc: '冷卻 ×0.6、魔力消耗 ×0.8，效果 ×0.72',
    apply: d => {
      const x = mapDmg(d, e => ({ ...e, mult: mul(e.mult, 0.72) }));
      return {
        ...x, cd: d.cd * 0.6, mp: mul(d.mp, 0.8),
        effects: x.effects.map(e => (e.type === 'heal' ? { ...e, pct: mul(e.pct, 0.72) } : e.type === 'shield' ? { ...e, pct: mul(e.pct, 0.72) } : e)),
      };
    },
  }),
  /** 致命：額外暴擊率 */
  crit: (name: string): SkillSpec => ({
    name, desc: '額外暴擊率 +25%',
    apply: d => mapDmg(d, e => ({ ...e, bonusCrit: (e.bonusCrit ?? 0) + 25 })),
  }),
  /** 破甲：無視防禦 */
  pierce: (name: string): SkillSpec => ({
    name, desc: '無視目標 50% 防禦',
    apply: d => mapDmg(d, e => ({ ...e, pierce: Math.min(1, (e.pierce ?? 0) + 0.5) })),
  }),
  /** 異常強化：提高指定異常的觸發機率，傷害略降 */
  status: (name: string, id: StatusApply['id'], label: string, add = 0.45): SkillSpec => ({
    name, desc: `${label}機率 +${Math.round(add * 100)}%，傷害 ×0.9`,
    apply: d => mapDmg(d, e => withStatus({ ...e, mult: mul(e.mult, 0.9) }, id, add)),
  }),
  /** 元素轉換：改成火焰傷害並附加燃燒 */
  fire: (name: string): SkillSpec => ({
    name, desc: '改為火焰傷害，燃燒機率 +50%',
    apply: d => mapDmg(d, e => withStatus({ ...e, element: 'fire', dmgType: e.dmgType }, 'burn', 0.5)),
  }),
  /** 增益：持久 */
  enduring: (name: string): SkillSpec => ({
    name, desc: '持續時間 ×1.6，冷卻 ×1.2',
    apply: d => ({ ...mapType(d, 'buff', e => ({ ...e, dur: e.dur * 1.6 })), cd: d.cd * 1.2 }),
  }),
  /** 增益：強化 */
  intense: (name: string): SkillSpec => ({
    name, desc: '增益效果 ×1.4，持續時間 ×0.7',
    apply: d => mapType(d, 'buff', e => ({ ...e, dur: e.dur * 0.7, mods: (r: number) => e.mods(r).map(m => ({ ...m, value: m.value * 1.4 })) })),
  }),
  /** 護盾／治療：量更大 */
  bulwark: (name: string): SkillSpec => ({
    name, desc: '護盾與治療量 ×1.5，冷卻 ×1.35',
    apply: d => ({
      ...d, cd: d.cd * 1.35,
      effects: d.effects.map(e => (e.type === 'shield' || e.type === 'heal' ? { ...e, pct: mul(e.pct, 1.5) } : e)),
    }),
  }),
  /** 治療強化（攻擊兼治療的技能） */
  healBoost: (name: string): SkillSpec => ({
    name, desc: '治療量 ×1.6，傷害 ×0.8',
    apply: d => {
      const x = mapDmg(d, e => ({ ...e, mult: mul(e.mult, 0.8) }));
      return { ...x, effects: x.effects.map(e => (e.type === 'heal' ? { ...e, pct: mul(e.pct, 1.6) } : e)) };
    },
  }),
  /** 召喚：大軍（出手更快、較弱） */
  horde: (name: string): SkillSpec => ({
    name, desc: '召喚物出手間隔 ×0.6，傷害 ×0.75',
    apply: d => mapType(d, 'summon', e => ({ ...e, interval: e.interval * 0.6, mult: mul(e.mult, 0.75) })),
  }),
  /** 召喚：精銳（更強更久，冷卻較長） */
  elite: (name: string): SkillSpec => ({
    name, desc: '召喚物傷害 ×1.4、持續 ×1.5，冷卻 ×1.3',
    apply: d => ({ ...mapType(d, 'summon', e => ({ ...e, mult: mul(e.mult, 1.4), dur: e.dur * 1.5 })), cd: d.cd * 1.3 }),
  }),
  /** 終極技：威力 */
  ultPower: (name: string): SkillSpec => ({
    name, desc: '傷害與增益效果 ×1.4，冷卻 ×1.25',
    apply: d => ({
      ...mapType(mapDmg(d, e => ({ ...e, mult: mul(e.mult, 1.4) })), 'buff', e => ({ ...e, mods: (r: number) => e.mods(r).map(m => ({ ...m, value: m.value * 1.4 })) })),
      cd: d.cd * 1.25,
    }),
  }),
};

/** 每個技能的兩種專精 */
export const SKILL_SPECS: Record<string, [SkillSpec, SkillSpec]> = {
  // 劍士
  w_slash: [T.spread('旋風劈砍'), { ...T.crit('致命重擊'), desc: '額外暴擊率 +25%，傷害 ×1.15', apply: d => mapDmg(T.crit('').apply(d), e => ({ ...e, mult: mul(e.mult, 1.15) })) }],
  w_sweep: [T.barrage('連環橫掃'), T.pierce('破甲橫掃')],
  w_warcry: [T.enduring('長嘯'), T.intense('怒吼')],
  w_bash: [T.status('震盪', 'stun', '暈眩', 0.3), T.heavy('盾牌猛擊')],
  b_bloodlust: [T.enduring('血之渴望'), T.intense('血怒')],
  b_whirl: [T.status('撕裂旋風', 'bleed', '流血', 0.5), T.swift('狂風')],
  b_ragegod: [T.ultPower('毀滅之神'), T.swift('連續降臨')],
  p_holyshield: [T.bulwark('堅壁'), T.swift('迅捷護盾')],
  p_justice: [T.spread('審判之環'), T.crit('神聖烙印')],
  p_sanctuary: [T.ultPower('聖光領域'), T.swift('頻繁祈禱')],
  // 遊俠
  r_double: [T.barrage('四連射'), T.crit('精準射擊')],
  r_multi: [T.barrage('箭幕'), T.status('毒箭', 'poison', '中毒', 0.5)],
  r_hawkeye: [T.enduring('鷹之凝視'), T.intense('獵鷹之眼')],
  r_pierce: [T.spread('貫穿'), T.pierce('破甲箭')],
  m_snipe: [T.swift('連狙'), T.crit('爆頭')],
  m_rain: [T.barrage('暴雨'), T.fire('火矢雨')],
  m_meteorshot: [T.ultPower('隕星'), T.swift('連發流星')],
  a_cloud: [T.status('腐蝕霧', 'weaken', '虛弱', 0.6), T.swift('瀰漫')],
  a_shadow: [T.barrage('影分身'), T.crit('暗殺')],
  a_blades: [T.ultPower('萬刃'), T.barrage('刃之風暴')],
  // 法師
  g_fireball: [T.spread('爆裂火球'), T.status('烈焰', 'burn', '燃燒', 0.5)],
  g_nova: [T.status('冰封', 'freeze', '冰凍', 0.3), T.barrage('寒潮')],
  g_chain: [T.barrage('雷暴'), T.status('超載', 'shock', '感電', 0.5)],
  g_manashield: [T.bulwark('魔力壁壘'), T.swift('瞬發護盾')],
  e_meteor: [T.barrage('流星群'), T.heavy('巨隕')],
  e_blizzard: [T.status('永凍', 'freeze', '冰凍', 0.3), T.crit('冰刃')],
  e_storm: [T.ultPower('元素崩壞'), T.swift('元素脈動')],
  k_bolt: [T.barrage('暗影彈幕'), T.pierce('虛空箭')],
  k_skeleton: [T.horde('骷髏大軍'), T.elite('骷髏精兵')],
  k_doom: [T.ultPower('終焉'), T.swift('災厄循環')],
  // 祭司
  c_bolt: [T.spread('聖光散射'), T.crit('聖光凝聚')],
  c_heal: [T.bulwark('大治癒'), T.swift('快速治療')],
  c_bless: [T.enduring('長久祝福'), T.intense('神聖祝福')],
  c_nova: [T.barrage('光之波動'), T.healBoost('治癒新星')],
  h_wings: [T.bulwark('守護之翼'), T.enduring('永恆之翼')],
  h_divine: [T.barrage('天光連擊'), T.status('審判之光', 'stun', '暈眩', 0.3)],
  h_angel: [T.ultPower('大天使'), T.swift('天使庇護')],
  q_hammer: [T.spread('聖錘風暴'), T.heavy('重錘')],
  q_condemn: [T.status('深度制裁', 'curse', '詛咒', 0.6), T.swift('即刻制裁')],
  q_wrath: [T.ultPower('天譴'), T.barrage('神罰連擊')],
};

/** 取得套用專精後的技能（未選或等級不足則回傳原技能） */
export function applySpec(def: SkillDef, spec: number | undefined, rank: number): SkillDef {
  const pair = SKILL_SPECS[def.id];
  if (!pair || spec === undefined || spec < 0 || rank < SPEC_RANK) return def;
  return pair[spec]?.apply(def) ?? def;
}
