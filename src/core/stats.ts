/** 數值與修正值系統。所有加成最後都化成 Mod，再由 computeStats 統一計算。 */

export const ELEMENTS = ['phys', 'fire', 'ice', 'lightning', 'holy', 'shadow'] as const;
export type Element = (typeof ELEMENTS)[number];

export const ELEMENT_LABEL: Record<Element, string> = {
  phys: '無屬性', fire: '火焰', ice: '冰霜', lightning: '雷電', holy: '神聖', shadow: '暗影',
};
export const ELEMENT_COLOR: Record<Element, string> = {
  phys: '#e8e2d4', fire: '#ff7a3d', ice: '#7fd8ff', lightning: '#ffe35c', holy: '#fff2a8', shadow: '#b67bff',
};

export const PRIMARY = ['str', 'dex', 'int', 'vit'] as const;
export type Primary = (typeof PRIMARY)[number];

const STAT_DEFS = {
  // 主屬性
  str: { label: '力量', pct: false },
  dex: { label: '敏捷', pct: false },
  int: { label: '智力', pct: false },
  vit: { label: '體質', pct: false },
  allStats: { label: '全屬性', pct: false },
  // 基本
  hp: { label: '生命', pct: false },
  mp: { label: '魔力', pct: false },
  atk: { label: '物理攻擊', pct: false },
  matk: { label: '魔法攻擊', pct: false },
  def: { label: '防禦', pct: false },
  res: { label: '魔抗', pct: false },
  eva: { label: '迴避', pct: false },
  hpRegen: { label: '每秒生命回復', pct: false },
  mpRegen: { label: '每秒魔力回復', pct: false },
  // 百分比
  crit: { label: '暴擊率', pct: true },
  critDmg: { label: '暴擊傷害', pct: true },
  haste: { label: '攻擊速度', pct: true },
  cdr: { label: '冷卻縮減', pct: true },
  lifesteal: { label: '吸血', pct: true },
  dmg: { label: '全傷害', pct: true },
  physDmg: { label: '物理傷害', pct: true },
  magDmg: { label: '魔法傷害', pct: true },
  fireDmg: { label: '火焰傷害', pct: true },
  iceDmg: { label: '冰霜傷害', pct: true },
  lightningDmg: { label: '雷電傷害', pct: true },
  holyDmg: { label: '神聖傷害', pct: true },
  shadowDmg: { label: '暗影傷害', pct: true },
  skillDmg: { label: '技能傷害', pct: true },
  bossDmg: { label: '對首領傷害', pct: true },
  eliteDmg: { label: '對精英傷害', pct: true },
  dotDmg: { label: '持續傷害', pct: true },
  dmgTaken: { label: '受到傷害', pct: true },
  fireRes: { label: '火焰抗性', pct: true },
  iceRes: { label: '冰霜抗性', pct: true },
  lightningRes: { label: '雷電抗性', pct: true },
  holyRes: { label: '神聖抗性', pct: true },
  shadowRes: { label: '暗影抗性', pct: true },
  statusChance: { label: '異常觸發率', pct: true },
  healPower: { label: '治療效果', pct: true },
  shieldPower: { label: '護盾效果', pct: true },
  petDmg: { label: '寵物傷害', pct: true },
  goldFind: { label: '金幣獲得', pct: true },
  xpGain: { label: '經驗獲得', pct: true },
  magicFind: { label: '掉寶率', pct: true },
} as const;

export type StatKey = keyof typeof STAT_DEFS;
export const STAT_KEYS = Object.keys(STAT_DEFS) as StatKey[];
export const statLabel = (k: StatKey) => STAT_DEFS[k].label;
export const statIsPct = (k: StatKey) => STAT_DEFS[k].pct;

export type StatBlock = Record<StatKey, number>;

export type ModKind = 'flat' | 'inc' | 'more';
export interface Mod {
  stat: StatKey;
  kind: ModKind;
  /** flat：直接加值（百分比屬性則是百分點）；inc / more：以 % 表示，例如 20 代表 +20% */
  value: number;
}

export const flat = (stat: StatKey, value: number): Mod => ({ stat, kind: 'flat', value });
export const inc = (stat: StatKey, value: number): Mod => ({ stat, kind: 'inc', value });
export const more = (stat: StatKey, value: number): Mod => ({ stat, kind: 'more', value });

export function emptyStats(): StatBlock {
  const s = {} as StatBlock;
  for (const k of STAT_KEYS) s[k] = 0;
  return s;
}

interface Acc { flat: number; inc: number; more: number }

function accumulate(mods: readonly Mod[]): Map<StatKey, Acc> {
  const m = new Map<StatKey, Acc>();
  for (const mod of mods) {
    let a = m.get(mod.stat);
    if (!a) m.set(mod.stat, (a = { flat: 0, inc: 0, more: 1 }));
    if (mod.kind === 'flat') a.flat += mod.value;
    else if (mod.kind === 'inc') a.inc += mod.value;
    else a.more *= 1 + mod.value / 100;
  }
  return m;
}

const applyAcc = (base: number, a: Acc | undefined) =>
  a ? (base + a.flat) * (1 + a.inc / 100) * a.more : base;

/** 主屬性換算成次要屬性的係數（職業可額外加碼） */
export type Conversion = Partial<Record<Primary, Partial<Record<StatKey, number>>>>;

export const BASE_CONVERSION: Conversion = {
  str: { atk: 2, hp: 3 },
  dex: { atk: 1, crit: 0.04, eva: 1, haste: 0.05 },
  int: { matk: 2.5, mp: 3, res: 0.5 },
  vit: { hp: 12, def: 0.6 },
};

export interface StatInput {
  /** 未經修正的基礎值（例如職業基礎 + 等級成長 + 配點） */
  base: Partial<StatBlock>;
  mods: readonly Mod[];
  conversions?: Conversion[];
}

/**
 * 計算最終數值：
 * 1. 主屬性 = (基礎 + flat + 全屬性 flat) × (1 + inc) × more
 * 2. 主屬性換算成次要屬性的 flat
 * 3. 其他屬性 = (基礎 + 換算 + flat) × (1 + inc) × more
 */
export function computeStats({ base, mods, conversions = [BASE_CONVERSION] }: StatInput): StatBlock {
  const acc = accumulate(mods);
  const out = emptyStats();
  const all = acc.get('allStats');
  for (const p of PRIMARY) {
    const a = acc.get(p);
    const merged: Acc = {
      flat: (a?.flat ?? 0) + (all?.flat ?? 0),
      inc: (a?.inc ?? 0) + (all?.inc ?? 0),
      more: (a?.more ?? 1) * (all?.more ?? 1),
    };
    out[p] = Math.max(0, applyAcc(base[p] ?? 0, merged));
  }
  const converted = emptyStats();
  for (const conv of conversions) {
    for (const p of PRIMARY) {
      const table = conv[p];
      if (!table) continue;
      for (const k in table) converted[k as StatKey] += out[p] * (table[k as StatKey] ?? 0);
    }
  }
  for (const k of STAT_KEYS) {
    if ((PRIMARY as readonly string[]).includes(k) || k === 'allStats') continue;
    out[k] = applyAcc((base[k] ?? 0) + converted[k], acc.get(k));
  }
  return out;
}

/** 將 Mod 轉成玩家看得懂的文字，例如「+12% 暴擊傷害」 */
export function describeMod(m: Mod, digits = 0): string {
  const label = statLabel(m.stat);
  const v = m.value;
  const sign = v >= 0 ? '+' : '−';
  const abs = Math.abs(v);
  const num = statIsPct(m.stat) || m.kind !== 'flat'
    ? `${abs.toFixed(abs < 10 && digits === 0 && abs % 1 !== 0 ? 1 : digits)}%`
    : formatInt(abs);
  if (m.kind === 'more') return `${label}額外 ${sign}${num}`;
  if (m.kind === 'inc' && !statIsPct(m.stat)) return `${sign}${num} ${label}`;
  return `${sign}${num} ${label}`;
}

function formatInt(n: number): string {
  return Math.round(n).toLocaleString('en-US');
}

/** 把多個 mod 依 stat+kind 合併，方便顯示 */
export function mergeMods(mods: readonly Mod[]): Mod[] {
  const map = new Map<string, Mod>();
  for (const m of mods) {
    const key = m.stat + '|' + m.kind;
    const cur = map.get(key);
    if (!cur) map.set(key, { ...m });
    else if (m.kind === 'more') cur.value = ((1 + cur.value / 100) * (1 + m.value / 100) - 1) * 100;
    else cur.value += m.value;
  }
  return [...map.values()];
}
