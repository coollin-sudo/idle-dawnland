import type { GameState } from '@/core/types';
import { combatPower, heroStats } from '@/systems/hero';
import { LB_ANON_KEY, LB_URL } from './config';
import { weekKey } from './week';

/**
 * 線上排行榜（Supabase）。資料表與函式見 supabase/leaderboard.sql。
 * 瀏覽器只呼叫 lb_submit / lb_board / lb_leave 三個函式，不能直接讀寫資料表。
 */
export type BoardId = 'progress' | 'boss' | 'tower' | 'power';

export interface BoardRow {
  pos: number;
  name: string;
  class_id: string;
  adv_id: string | null;
  level: number;
  rebirths: number;
  score: number;
  achieved_at: string;
  is_me: boolean;
  under_review?: boolean;
}

export const leaderboardEnabled = () => !!(LB_URL && LB_ANON_KEY);

async function rpc<T>(fn: string, body: Record<string, unknown>): Promise<T> {
  const res = await fetch(`${LB_URL}/rest/v1/rpc/${fn}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', apikey: LB_ANON_KEY, Authorization: `Bearer ${LB_ANON_KEY}` },
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error(`${res.status} ${await res.text().catch(() => '')}`.slice(0, 200));
  const text = await res.text();
  return (text ? JSON.parse(text) : null) as T;
}

/** 這份存檔的排行榜身分（隨機 token，跟著存檔走，匯出匯入後仍是同一個人） */
export function ensureToken(s: GameState): string {
  if (!s.online.token) {
    const bytes = new Uint8Array(24);
    crypto.getRandomValues(bytes);
    s.online.token = Array.from(bytes, b => b.toString(16).padStart(2, '0')).join('');
  }
  return s.online.token;
}

export function scoresOf(s: GameState, now: number) {
  const progress = Math.max(s.records.bestEff, ...s.progress.best.map((b, d) => (b >= 0 ? d * 80 + b : -1)));
  const scores: Record<string, unknown> = { power: combatPower(s, heroStats(s)) };
  if (progress >= 0) scores.progress = progress;
  if (s.tower.week === weekKey(now) && s.tower.weekBest > 0) scores.tower = s.tower.weekBest;
  const boss: Record<string, unknown> = {};
  for (const [k, ms] of Object.entries(s.records.boss)) boss[k] = s.records.bossLv?.[k] !== undefined ? { ms, lv: s.records.bossLv[k] } : ms;
  if (Object.keys(boss).length) scores.boss = boss;
  return scores;
}

export type SubmitResult = 'ok' | 'adjusted' | 'hidden' | 'too_fast' | 'skip';

export async function submitScores(s: GameState, now = Date.now()): Promise<SubmitResult> {
  if (!leaderboardEnabled() || !s.online.joined || s.online.tainted) return 'skip';
  const r = await rpc<{ ok: boolean; adjusted?: boolean; hidden?: boolean; reason?: string }>('lb_submit', {
    p_token: ensureToken(s), p_name: s.hero.name, p_class: s.hero.classId, p_adv: s.hero.advId,
    p_level: s.hero.level, p_rebirths: s.rebirth.count, p_scores: scoresOf(s, now), p_max_level: Math.max(s.hero.maxLevel ?? 1, s.hero.level),
  });
  if (!r?.ok) return 'too_fast';
  s.online.lastSubmit = now;
  return r.hidden ? 'hidden' : r.adjusted ? 'adjusted' : 'ok';
}

export function fetchBoard(s: GameState, board: BoardId, key: string | null, classId: string | null, limit = 50) {
  return rpc<BoardRow[]>('lb_board', {
    p_board: board, p_key: key, p_class: classId, p_limit: limit, p_token: s.online.token || null,
  }).then(rows => (rows ?? []).map(r => ({ ...r, pos: Number(r.pos) })));
}

export async function leaveBoard(s: GameState) {
  if (s.online.token && leaderboardEnabled()) await rpc('lb_leave', { p_token: s.online.token });
  s.online.joined = false;
}

/** 自動上傳的間隔 */
export const SUBMIT_EVERY_MS = 10 * 60_000;
