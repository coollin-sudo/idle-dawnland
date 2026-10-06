import { Game } from '@/core/game';
import { DIFFICULTIES, stageLevel } from '@/core/formulas';
import type { Item, Rarity } from '@/core/types';
import { STAR_NODES } from '@/data/meta';
import { heroStats } from './hero';
import { generateItem, rollRarity } from './items';
import { itemCtx, receiveItem } from './loot';
import { gainXp } from './progression';

const OFFLINE_EFFICIENCY = 0.7;
const BASE_CAP_H = 12;

// ---------------------------------------------------------------------
// 線上效率追蹤（只計算主線關卡）
// ---------------------------------------------------------------------
const windows = new WeakMap<Game, { ms: number; xp: number; gold: number; kills: number }>();

export function trackRates(g: Game, dt: number) {
  if (g.headless || g.activity.kind !== 'stage') return;
  const c = g.state.counters;
  let w = windows.get(g);
  if (!w) {
    w = { ms: 0, xp: c.xpEarned ?? 0, gold: c.goldEarned ?? 0, kills: c.kills ?? 0 };
    windows.set(g, w);
  }
  w.ms += dt;
  if (w.ms < 30_000) return;
  const sec = w.ms / 1000;
  const r = g.state.rate;
  const sample = {
    xp: ((c.xpEarned ?? 0) - w.xp) / sec,
    gold: ((c.goldEarned ?? 0) - w.gold) / sec,
    kills: ((c.kills ?? 0) - w.kills) / sec,
  };
  const a = r.samples < 1 ? 1 : 0.2;
  r.xp = r.xp * (1 - a) + sample.xp * a;
  r.gold = r.gold * (1 - a) + sample.gold * a;
  r.kills = r.kills * (1 - a) + sample.kills * a;
  r.samples++;
  windows.set(g, { ms: 0, xp: c.xpEarned ?? 0, gold: c.goldEarned ?? 0, kills: c.kills ?? 0 });
}

/** 用真實戰鬥邏輯在背景模擬目前關卡，量測效率 */
export function measureRates(g: Game, seconds = 150) {
  const clone = structuredClone(g.state);
  clone.progress.mode = 'farm';
  clone.hero.hp = 0;
  const sim = new Game(clone, { headless: true, now: g.now });
  const c0 = { ...clone.counters };
  sim.advance(seconds * 1000);
  const c1 = sim.state.counters;
  const d = (k: string) => ((c1[k] ?? 0) - (c0[k] ?? 0)) / seconds;
  return { xp: d('xpEarned'), gold: d('goldEarned'), kills: d('kills'), deaths: (c1.deaths ?? 0) - (c0.deaths ?? 0) };
}

export function offlineCapMs(g: Game) {
  const node = STAR_NODES.find(n => n.special === 'offline')!;
  const extra = (g.state.rebirth.ranks[node.id] ?? 0) * (node.per ?? 0);
  return (BASE_CAP_H + extra) * 3600_000;
}

export interface OfflineReport {
  away: number;
  counted: number;
  xp: number;
  gold: number;
  kills: number;
  levels: number;
  stones: number;
  items: { kept: Item[]; salvaged: number; byRarity: number[] };
}

export function applyOffline(g: Game, awayMs: number): OfflineReport | null {
  if (awayMs < 60_000) return null;
  const counted = Math.min(awayMs, offlineCapMs(g));
  const s = g.state;
  // 樣本不足或剛換裝時，用背景模擬量測
  let rate = s.rate;
  if (rate.samples < 2 || rate.kills <= 0) rate = { ...measureRates(g), samples: 1 };
  const sec = counted / 1000 * OFFLINE_EFFICIENCY;
  const xp = Math.round(rate.xp * sec);
  const gold = Math.round(rate.gold * sec);
  const kills = Math.round(rate.kills * sec);
  if (kills <= 0 && xp <= 0) return { away: awayMs, counted, xp: 0, gold: 0, kills: 0, levels: 0, stones: 0, items: { kept: [], salvaged: 0, byRarity: [0, 0, 0, 0, 0, 0] } };

  const levelBefore = s.hero.level;
  const muted = g.ev.muted;
  g.ev.muted = true;
  gainXp(g, xp);
  s.cur.gold += gold;
  g.count('goldEarned', gold);
  g.count('xpEarned', xp);
  g.count('kills', kills);
  const stones = Math.round(kills * 0.04);
  s.cur.stones += stones;

  const st = heroStats(s);
  const diff = s.progress.difficulty;
  const L = stageLevel(diff, s.progress.stage);
  const drops = Math.min(400, Math.round(kills * 0.06));
  const byRarity = [0, 0, 0, 0, 0, 0];
  const kept: Item[] = [];
  let salvaged = 0;
  for (let i = 0; i < drops; i++) {
    const rarity = rollRarity(g.rng, g.rng.chance(0.05) ? 'elite' : 'normal', st.magicFind + DIFFICULTIES[diff].dropBonus, diff) as Rarity;
    const item = generateItem(itemCtx(g), { ilvl: L + g.rng.int(-1, 1), rarity });
    byRarity[rarity]++;
    const r = receiveItem(g, item);
    if (r === 'salvaged') salvaged++;
    else kept.push(item);
  }
  g.ev.muted = muted;
  g.heroChanged();
  return { away: awayMs, counted, xp, gold, kills, levels: s.hero.level - levelBefore, stones, items: { kept, salvaged, byRarity } };
}
