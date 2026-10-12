import type { Game } from '@/core/game';
import { DIFFICULTIES, mobHp, REBIRTH_REGION, stageLevel } from '@/core/formulas';
import { STAR_NODES, starCost } from '@/data/meta';
import { classSkills } from '@/data/skills';

/**
 * 星魂共鳴：依累計獲得的星魂，永久提升攻擊、魔攻與生命（獨立乘算，沒有上限）。
 * 加成 = 15% × √累計星魂；累計約 4 倍才能讓加成翻倍（參考《The Math of Idle Games》的轉生曲線）。
 */
export const RESONANCE_PER_SQRT = 15;
export const resonancePct = (earned: number) => RESONANCE_PER_SQRT * Math.sqrt(Math.max(0, earned));

const LAST_STAGE = 79;

/** 高難度的關卡換算成「怪物一樣強」的普通難度關卡（可以超過 79） */
export function normalEquivalent(difficulty: number, stage: number) {
  if (difficulty === 0) return stage;
  const target = mobHp(stageLevel(difficulty, stage)) * DIFFICULTIES[difficulty].mult;
  let x = 0;
  while (x < 400 && mobHp(stageLevel(0, x)) < target) x++;
  return x;
}

/**
 * 這一輪通關某關後的推進度（決定星魂與能否轉生）。
 * 這一輪有先打通前一個難度，才照「難度 × 80 ＋ 關卡」計（打通普通再進惡夢的加成）；
 * 轉生後直接跳進已解鎖的高難度時，改用怪物強度換算成等效的普通關卡，避免跳關刷星魂。
 */
export function runProgress(best: number[], difficulty: number, stage: number) {
  const full = difficulty * 80 + stage;
  if (difficulty === 0 || best[difficulty - 1] >= LAST_STAGE) return full;
  return Math.min(full, normalEquivalent(difficulty, stage));
}

/** 這一輪目前的推進度：各難度已通關的最遠關卡取最高（打通前一個難度後，高難度的進度會立刻改用完整算法） */
export function runBest(best: number[]) {
  let out = -1;
  best.forEach((b, d) => { if (b >= 0) out = Math.max(out, runProgress(best, d, b)); });
  return out;
}

/** 這一輪要推進到相當於普通難度第 5 區（霜語山脈）通關，才能轉生 */
export function canRebirth(g: Game) {
  return g.state.rebirth.bestStageEver >= REBIRTH_REGION * 10 - 1;
}

export function soulsPreview(g: Game) {
  return soulsAt(g, g.state.rebirth.bestStageEver);
}

/** 推進度 progress（難度 × 80 ＋ 關卡，或等效普通關卡）時轉生可得的星魂 */
function soulsAt(g: Game, progress: number) {
  const eff = progress + 1;
  if (eff <= 0) return 0;
  const node = STAR_NODES.find(n => n.special === 'souls')!;
  const bonus = 1 + (g.state.rebirth.ranks[node.id] ?? 0) * (node.per ?? 0) / 100;
  const levelPart = g.state.hero.level / 4;
  return Math.floor((Math.pow(eff, 1.5) / 5 + levelPart) * bonus);
}

/**
 * 跳關提示：這一輪直接打了高難度、卻還沒打通前一個難度時，
 * 告訴玩家打通前一個難度後，這次轉生的星魂會變成多少（沒有差別時回傳 null）。
 */
export function skipHint(g: Game): { need: string; target: string; now: number; full: number } | null {
  const best = g.state.progress.best;
  let pick = -1;
  for (let d = 1; d < best.length; d++) if (best[d] >= 0 && best[d - 1] < LAST_STAGE) pick = d;
  if (pick < 0) return null;
  const now = soulsPreview(g);
  const full = soulsAt(g, Math.max(g.state.rebirth.bestStageEver, pick * 80 + best[pick]));
  if (full <= now) return null;
  return { need: DIFFICULTIES[pick - 1].name, target: DIFFICULTIES[pick].name, now, full };
}

export function startStageAfterRebirth(g: Game) {
  const node = STAR_NODES.find(n => n.special === 'startStage')!;
  return Math.min(70, (g.state.rebirth.ranks[node.id] ?? 0) * (node.per ?? 0));
}

export function rebirth(g: Game) {
  if (!canRebirth(g)) return g.toast('這一輪需要先推進到相當於普通難度第 5 區通關', 'warn');
  const s = g.state;
  const souls = soulsPreview(g);
  s.cur.starSouls += souls;
  s.rebirth.soulsEarned = (s.rebirth.soulsEarned ?? 0) + souls;
  s.rebirth.count++;
  s.rebirth.bestStageEver = -1;
  // 已解鎖的難度保留；普通難度依「起點躍遷」從後面的關卡開始，高難度從第 1 關開始
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
  // 金幣保留：金幣幾乎都能換成會保留的東西（強化、強化石、保護卷軸），歸零只會逼玩家轉生前先花光
  s.progress = { difficulty: 0, stage: start, wave: 0, mode: 'push', best: [start - 1, -1, -1], unlockedDifficulty: s.progress.unlockedDifficulty };
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
