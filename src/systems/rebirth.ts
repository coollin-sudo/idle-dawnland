import type { Game } from '@/core/game';
import { REBIRTH_REGION } from '@/core/formulas';
import { STAR_NODES, starCost } from '@/data/meta';
import { classSkills } from '@/data/skills';

/**
 * 星魂共鳴：依累計獲得的星魂，永久提升攻擊、魔攻與生命（獨立乘算，沒有上限）。
 * 加成 = 15% × √累計星魂；累計約 4 倍才能讓加成翻倍（參考《The Math of Idle Games》的轉生曲線）。
 */
export const RESONANCE_PER_SQRT = 15;
export const resonancePct = (earned: number) => RESONANCE_PER_SQRT * Math.sqrt(Math.max(0, earned));

export function canRebirth(g: Game) {
  return g.state.progress.best[0] >= REBIRTH_REGION * 10 - 1;
}

export function soulsPreview(g: Game) {
  const eff = g.state.rebirth.bestStageEver + 1;
  if (eff <= 0) return 0;
  const node = STAR_NODES.find(n => n.special === 'souls')!;
  const bonus = 1 + (g.state.rebirth.ranks[node.id] ?? 0) * (node.per ?? 0) / 100;
  const levelPart = g.state.hero.level / 4;
  return Math.floor((Math.pow(eff, 1.5) / 5 + levelPart) * bonus);
}

export function startStageAfterRebirth(g: Game) {
  const node = STAR_NODES.find(n => n.special === 'startStage')!;
  return Math.min(70, (g.state.rebirth.ranks[node.id] ?? 0) * (node.per ?? 0));
}

export function rebirth(g: Game) {
  if (!canRebirth(g)) return g.toast('需要先通關第 5 區', 'warn');
  const s = g.state;
  const souls = soulsPreview(g);
  s.cur.starSouls += souls;
  s.rebirth.soulsEarned = (s.rebirth.soulsEarned ?? 0) + souls;
  s.rebirth.count++;
  s.rebirth.bestStageEver = -1;
  const start = startStageAfterRebirth(g);
  const h = s.hero;
  const first = classSkills(h.classId).find(sk => !sk.advId && sk.unlock === 1)!;
  h.maxLevel = Math.max(h.maxLevel ?? 1, h.level);
  h.level = 1;
  h.xp = 0;
  h.statPoints = 0;
  h.alloc = { str: 0, dex: 0, int: 0, vit: 0 };
  h.skillPoints = 0;
  h.skillRanks = { [first.id]: 1 };
  h.loadout = [first.id, null, null, null];
  h.loadoutHold = [false, false, false, false];
  h.loadoutManual = false;
  h.talentRanks = {};
  h.hp = 0;
  s.cur.gold = 0;
  s.progress = { difficulty: 0, stage: start, wave: 0, mode: 'push', best: [start - 1, -1, -1], unlockedDifficulty: 0 };
  g.count('rebirths');
  g.toast(`轉生完成！獲得星魂 ${souls}`, 'legend', '🌌');
  g.heroChanged();
  g.startActivity('stage');
}

export function starUpgrade(g: Game, id: string) {
  const node = STAR_NODES.find(n => n.id === id);
  if (!node) return;
  const r = g.state.rebirth.ranks[id] ?? 0;
  if (r >= node.max) return;
  const cost = starCost(node, r);
  if (g.state.cur.starSouls < cost) return g.toast('星魂不足', 'warn');
  g.state.cur.starSouls -= cost;
  g.state.rebirth.ranks[id] = r + 1;
  g.heroChanged();
}
