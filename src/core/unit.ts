import { computeStats, type Conversion, type Element, type Mod, type StatBlock, type StatKey } from './stats';
import { softHaste } from './stats';
import type { BasicAttack, BossMechId, Family, SkillDef, StatusId } from './types';
import { STATUSES } from '@/data/statuses';

export type Side = 'hero' | 'enemy';
export type UnitKind = 'hero' | 'monster' | 'pet' | 'summon';

export interface StatusInst {
  id: StatusId;
  stacks: number;
  remaining: number;
  /** 持續傷害：每層每秒傷害 */
  dps: number;
  tickAcc: number;
  srcUid: number;
}

export interface BuffInst {
  id: string;
  name: string;
  remaining: number;
  mods: Mod[];
}

export interface SkillSlot {
  def: SkillDef;
  rank: number;
  /** 保留：有首領時只在首領詠唱或露出破綻的瞬間施放 */
  hold?: boolean;
}

export interface Unit {
  uid: number;
  side: Side;
  kind: UnitKind;
  name: string;
  defId: string;
  level: number;
  family?: Family;
  boss: boolean;
  /** 首領機制 */
  mech?: BossMechId;
  elite: string[];
  slot: number;

  statBase: Partial<StatBlock>;
  baseMods: Mod[];
  conversions: Conversion[];
  stats: StatBlock;

  hp: number;
  mp: number;
  shield: number;
  shieldTime: number;
  alive: boolean;
  targetable: boolean;

  interval: number;
  actTimer: number;
  basic: BasicAttack & { mult: number };
  skills: SkillSlot[];
  cds: Record<string, number>;
  casting: { skill: SkillDef; rank: number; remaining: number; total: number } | null;
  statuses: StatusInst[];
  buffs: BuffInst[];
  resist: Partial<Record<Element, number>>;
  powers: Record<string, number>;
  /** 戰鬥中的暫存狀態（特效冷卻、計數器等） */
  mem: Record<string, number>;
  /** 召喚物到期時間 */
  expires?: number;
  /** 寵物/召喚物的主人 */
  ownerUid?: number;
  /** 用來讓渲染器畫圖 */
  look?: unknown;
  size: number;
  ranged: boolean;
}

const RES_STAT: Partial<Record<Element, StatKey>> = {
  fire: 'fireRes', ice: 'iceRes', lightning: 'lightningRes', holy: 'holyRes', shadow: 'shadowRes',
};

export function resistOf(u: Unit, el: Element): number {
  const k = RES_STAT[el];
  const v = (u.resist[el] ?? 0) + (k ? u.stats[k] : 0);
  return Math.max(-50, Math.min(75, v));
}

/** 依目前的 buff 與異常狀態重新計算數值，生命/魔力維持比例上限 */
export function recalc(u: Unit): void {
  const mods: Mod[] = [...u.baseMods];
  for (const b of u.buffs) mods.push(...b.mods);
  for (const s of u.statuses) {
    const def = STATUSES[s.id];
    if (def.mods) for (const m of def.mods) mods.push({ ...m, value: m.value * s.stacks });
  }
  u.stats = computeStats({ base: u.statBase, mods, conversions: u.conversions });
  u.stats.cdr = Math.min(40, u.stats.cdr);
  u.stats.crit = Math.min(100, u.stats.crit);
  u.stats.haste = Math.max(-60, softHaste(u.stats.haste));
  if (u.hp > u.stats.hp) u.hp = u.stats.hp;
  if (u.mp > u.stats.mp) u.mp = u.stats.mp;
}

export const hasStatus = (u: Unit, id: StatusId) => u.statuses.some(s => s.id === id);
export const statusStacks = (u: Unit, id: StatusId) => u.statuses.find(s => s.id === id)?.stacks ?? 0;
export const isDisabled = (u: Unit) => u.statuses.some(s => STATUSES[s.id].disable);
export const hpPct = (u: Unit) => (u.stats.hp > 0 ? u.hp / u.stats.hp : 0);
