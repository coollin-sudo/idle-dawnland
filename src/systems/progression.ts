import type { Game } from '@/core/game';
import { ADVANCE_LEVEL, MAX_LEVEL, SKILL_POINTS_PER_LEVEL, STAT_POINTS_PER_LEVEL, xpToNext } from '@/core/formulas';
import { LOADOUT_UNLOCK } from '@/core/state';
import { PRIMARY, type Primary } from '@/core/stats';
import type { AdvId, GameState, SkillDef } from '@/core/types';
import { ADVANCES, CLASSES } from '@/data/classes';
import { classSkills, getSkill, SKILL_MAX_RANK } from '@/data/skills';
import { TALENT_TIER_REQ, TALENT_TREES } from '@/data/talents';
import { talentSpent, talentTotal } from './hero';
import { generateItem } from './items';

export function gainXp(g: Game, amount: number) {
  const h = g.state.hero;
  if (h.level >= MAX_LEVEL) return;
  h.xp += amount;
  let ups = 0;
  while (h.level < MAX_LEVEL && h.xp >= xpToNext(h.level)) {
    h.xp -= xpToNext(h.level);
    h.level++;
    ups++;
    h.statPoints += STAT_POINTS_PER_LEVEL;
    h.skillPoints += SKILL_POINTS_PER_LEVEL;
  }
  if (h.level >= MAX_LEVEL) h.xp = 0;
  if (!ups) return;
  if (h.autoAlloc) autoSpend(g.state);
  g.countMax('maxLevel', h.level);
  g.heroChanged();
  g.pendingFullHeal = true;
  g.ev.emit('hero:level', { level: h.level });
  g.toast(`升級！等級 ${h.level}`, 'good', '⭐');
  for (const sk of availableSkills(g.state)) {
    if (sk.unlock > h.level - ups && sk.unlock <= h.level) g.toast(`新技能可學習：${sk.name}`, 'epic', sk.icon);
  }
  if (h.level >= ADVANCE_LEVEL && h.level - ups < ADVANCE_LEVEL && !h.advId) g.toast('可以轉職了！到「角色」頁選擇你的道路', 'legend', '🌟');
  const unlocked = LOADOUT_UNLOCK.filter(l => l > h.level - ups && l <= h.level && l > 1);
  if (unlocked.length) g.toast('技能欄位 +1', 'good', '🔓');
}

/** 自動配點：依職業比例分配屬性點，並自動學習／升級技能 */
export function autoSpend(s: GameState) {
  const h = s.hero;
  const ratio = CLASSES[h.classId].autoAlloc;
  const total = PRIMARY.reduce((a, p) => a + ratio[p], 0);
  while (h.statPoints > 0) {
    // 依目前分配與目標比例的差距挑最缺的
    let best: Primary = 'str', gap = -Infinity;
    const allocated = PRIMARY.reduce((a, p) => a + h.alloc[p], 0) + 1;
    for (const p of PRIMARY) {
      if (!ratio[p]) continue;
      const g = ratio[p] / total - h.alloc[p] / allocated;
      if (g > gap) { gap = g; best = p; }
    }
    h.alloc[best]++;
    h.statPoints--;
  }
  autoSkills(s);
}

/** 自動模式下技能的重要度：終極技 > 轉職技能 > 解鎖等級高的技能 */
const skillScore = (d: SkillDef) => (d.ultimate ? 200 : 0) + (d.advId ? 60 : 0) + d.unlock;

export function autoSkills(s: GameState) {
  const h = s.hero;
  // 1. 先學會所有可用但還沒學的技能（重要的先）
  const avail = availableSkills(s).sort((a, b) => skillScore(b) - skillScore(a));
  for (const sk of avail) {
    if (h.skillPoints <= 0) break;
    if ((h.skillRanks[sk.id] ?? 0) === 0) {
      h.skillRanks[sk.id] = 1;
      h.skillPoints--;
    }
  }
  // 2. 技能欄放入最重要的技能，施放順序也依重要度
  const slots = loadoutSlots(h.level);
  const learned = avail.filter(sk => (h.skillRanks[sk.id] ?? 0) > 0).slice(0, slots);
  for (let i = 0; i < h.loadout.length; i++) h.loadout[i] = learned[i]?.id ?? null;
  // 3. 剩下的點數平均升級技能欄中的技能（重要的先）
  let guard = 400;
  while (h.skillPoints > 0 && guard-- > 0) {
    const inLoadout = learned.filter(d => (h.skillRanks[d.id] ?? 0) < SKILL_MAX_RANK);
    if (!inLoadout.length) break;
    const target = inLoadout.reduce((a, b) => ((h.skillRanks[b.id] ?? 0) < (h.skillRanks[a.id] ?? 0) ? b : a));
    h.skillRanks[target.id] = (h.skillRanks[target.id] ?? 0) + 1;
    h.skillPoints--;
  }
}

export function loadoutSlots(level: number) {
  return LOADOUT_UNLOCK.filter(l => level >= l).length;
}

function freeLoadoutIndex(s: GameState) {
  const n = loadoutSlots(s.hero.level);
  for (let i = 0; i < n; i++) if (!s.hero.loadout[i]) return i;
  return -1;
}

export function availableSkills(s: GameState) {
  return classSkills(s.hero.classId).filter(sk => (!sk.advId || sk.advId === s.hero.advId) && sk.unlock <= s.hero.level);
}

export function allocate(g: Game, stat: Primary, n: number) {
  const h = g.state.hero;
  n = Math.min(n, h.statPoints);
  if (n <= 0) return;
  h.alloc[stat] += n;
  h.statPoints -= n;
  g.heroChanged();
}

export const RESET_STATS_GEMS = 30;
export function resetStats(g: Game) {
  const h = g.state.hero;
  if (g.state.cur.gems < RESET_STATS_GEMS) return g.toast('寶石不足', 'warn');
  g.state.cur.gems -= RESET_STATS_GEMS;
  const spent = PRIMARY.reduce((a, p) => a + h.alloc[p], 0);
  h.alloc = { str: 0, dex: 0, int: 0, vit: 0 };
  h.statPoints += spent;
  g.heroChanged();
  g.toast('屬性點已重置', 'good', '🔄');
}

export function learnSkill(g: Game, id: string) {
  const h = g.state.hero;
  const def = getSkill(id);
  if (h.skillPoints <= 0) return g.toast('技能點不足', 'warn');
  if (def.unlock > h.level) return g.toast(`需要等級 ${def.unlock}`, 'warn');
  if (def.advId && def.advId !== h.advId) return g.toast('需要轉職', 'warn');
  const r = h.skillRanks[id] ?? 0;
  if (r >= SKILL_MAX_RANK) return;
  h.skillRanks[id] = r + 1;
  h.skillPoints--;
  if (r === 0) {
    const free = freeLoadoutIndex(g.state);
    if (free >= 0 && !h.loadout.includes(id)) h.loadout[free] = id;
  }
  g.heroChanged();
}

export function setLoadout(g: Game, index: number, id: string | null) {
  const h = g.state.hero;
  if (index >= loadoutSlots(h.level)) return;
  if (id) {
    if ((h.skillRanks[id] ?? 0) <= 0) return;
    const existing = h.loadout.indexOf(id);
    if (existing >= 0) h.loadout[existing] = h.loadout[index];
  }
  h.loadout[index] = id;
  g.heroChanged();
}

export function swapLoadout(g: Game, a: number, b: number) {
  const L = g.state.hero.loadout;
  [L[a], L[b]] = [L[b], L[a]];
  g.heroChanged();
}

export const RESET_SKILLS_GOLD = (lv: number) => 200 * lv;
export function resetSkills(g: Game) {
  const h = g.state.hero;
  const cost = RESET_SKILLS_GOLD(h.level);
  if (g.state.cur.gold < cost) return g.toast('金幣不足', 'warn');
  g.state.cur.gold -= cost;
  const first = classSkills(h.classId).find(sk => !sk.advId && sk.unlock === 1)!;
  let pts = 0;
  for (const k in h.skillRanks) pts += h.skillRanks[k];
  h.skillRanks = { [first.id]: 1 };
  h.skillPoints += pts - 1;
  h.loadout = [first.id, null, null, null];
  g.heroChanged();
  g.toast('技能點已重置', 'good', '🔄');
}

// ---------------------------------------------------------------------
// 天賦
// ---------------------------------------------------------------------
export function talentAvailable(s: GameState) {
  return talentTotal(s) - talentSpent(s);
}

export function canTalent(s: GameState, nodeId: string): string | null {
  const tree = TALENT_TREES[s.hero.classId];
  const node = tree.nodes.find(n => n.id === nodeId);
  if (!node) return '未知天賦';
  const r = s.hero.talentRanks[nodeId] ?? 0;
  if (r >= node.maxRank) return '已滿級';
  if (talentAvailable(s) <= 0) return '天賦點不足';
  if (talentSpent(s) < TALENT_TIER_REQ[node.tier]) return `需要先投入 ${TALENT_TIER_REQ[node.tier]} 點`;
  if (node.req && !(s.hero.talentRanks[node.req] > 0)) return '需要前置天賦';
  return null;
}

export function talentUp(g: Game, nodeId: string) {
  const why = canTalent(g.state, nodeId);
  if (why) return g.toast(why, 'warn');
  g.state.hero.talentRanks[nodeId] = (g.state.hero.talentRanks[nodeId] ?? 0) + 1;
  g.heroChanged();
}

export const RESET_TALENT_GOLD = (lv: number) => 300 * lv;
export function resetTalents(g: Game) {
  const cost = RESET_TALENT_GOLD(g.state.hero.level);
  if (g.state.cur.gold < cost) return g.toast('金幣不足', 'warn');
  g.state.cur.gold -= cost;
  g.state.hero.talentRanks = {};
  g.heroChanged();
  g.toast('天賦已重置', 'good', '🔄');
}

// ---------------------------------------------------------------------
// 轉職
// ---------------------------------------------------------------------
export function advance(g: Game, advId: AdvId) {
  const h = g.state.hero;
  const adv = ADVANCES[advId];
  if (h.advId) return;
  if (h.level < ADVANCE_LEVEL) return g.toast(`需要等級 ${ADVANCE_LEVEL}`, 'warn');
  if (adv.classId !== h.classId) return;
  h.advId = advId;
  h.skillPoints += 3;
  if (h.autoAlloc) autoSkills(g.state);
  g.count('advanced');
  g.heroChanged();
  g.toast(`轉職成為「${adv.name}」！`, 'legend', '🌟');
}

/** 新角色的起始裝備（只會給一次） */
export function grantStarterKit(g: Game) {
  const s = g.state;
  if (s.counters.starterKit) return;
  s.counters.starterKit = 1;
  const ctx = { rng: g.rng, nextUid: g.nextUid, classId: s.hero.classId };
  s.equipment.weapon = { ...generateItem(ctx, { ilvl: 1, rarity: 1, slot: 'weapon' }), isNew: false };
  s.equipment.armor = { ...generateItem(ctx, { ilvl: 1, rarity: 0, slot: 'armor' }), isNew: false };
  g.heroChanged();
  g.pendingFullHeal = true;
}
