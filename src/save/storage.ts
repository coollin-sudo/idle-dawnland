import { newGameState, SAVE_VERSION, defaultSettings } from '@/core/state';
import type { GameState } from '@/core/types';

export const SAVE_KEY = 'dawnland-v2';

function isObj(v: unknown): v is Record<string, unknown> {
  return typeof v === 'object' && v !== null && !Array.isArray(v);
}

/** 把舊存檔補上新欄位（以新狀態為模板深度合併） */
function fill<T>(template: T, data: unknown): T {
  if (!isObj(template) || !isObj(data)) return (data === undefined ? template : data) as T;
  const out: Record<string, unknown> = { ...data };
  for (const k of Object.keys(template)) {
    const tv = (template as Record<string, unknown>)[k];
    if (!(k in data)) out[k] = tv;
    else if (isObj(tv) && isObj(data[k]) && !['equipment', 'achievements', 'counters', 'codex', 'skillRanks', 'talentRanks', 'owned', 'ranks', 'used', 'bought', 'best'].includes(k)) {
      out[k] = fill(tv, data[k]);
    }
  }
  return out as T;
}

export function migrate(raw: unknown): GameState | null {
  if (!isObj(raw) || !isObj(raw.hero) || typeof (raw.hero as Record<string, unknown>).classId !== 'string') return null;
  const hero = raw.hero as { name: string; classId: GameState['hero']['classId'] };
  const template = newGameState(hero.name, hero.classId);
  const s = fill(template, raw);
  s.settings = { ...defaultSettings(), ...(s.settings ?? {}) };
  while (s.progress.best.length < 3) s.progress.best.push(-1);
  s.version = SAVE_VERSION;
  return s;
}

export function loadState(): GameState | null {
  try {
    const raw = localStorage.getItem(SAVE_KEY);
    if (!raw) return null;
    return migrate(JSON.parse(raw));
  } catch {
    return null;
  }
}

export function saveState(s: GameState): boolean {
  try {
    s.lastSeen = Date.now();
    localStorage.setItem(SAVE_KEY, JSON.stringify(s));
    return true;
  } catch {
    return false;
  }
}

export function clearState() {
  try { localStorage.removeItem(SAVE_KEY); } catch { /* 無法存取儲存空間 */ }
}

// ---------------------------------------------------------------------
// 匯出 / 匯入存檔碼（支援 gzip 壓縮）
// ---------------------------------------------------------------------
function toB64(bytes: Uint8Array) {
  let s = '';
  for (let i = 0; i < bytes.length; i += 0x8000) s += String.fromCharCode(...bytes.subarray(i, i + 0x8000));
  return btoa(s);
}
function fromB64(b64: string) {
  const s = atob(b64);
  const out = new Uint8Array(s.length);
  for (let i = 0; i < s.length; i++) out[i] = s.charCodeAt(i);
  return out;
}

async function pipe(bytes: Uint8Array, stream: CompressionStream | DecompressionStream) {
  const res = new Response(new Blob([bytes as BlobPart]).stream().pipeThrough(stream));
  return new Uint8Array(await res.arrayBuffer());
}

export async function exportCode(s: GameState): Promise<string> {
  const json = new TextEncoder().encode(JSON.stringify(s));
  if (typeof CompressionStream !== 'undefined') {
    return 'DZ1:' + toB64(await pipe(json, new CompressionStream('gzip')));
  }
  return 'DJ1:' + toB64(json);
}

export async function importCode(code: string): Promise<GameState | null> {
  try {
    code = code.trim();
    let json: string;
    if (code.startsWith('DZ1:')) json = new TextDecoder().decode(await pipe(fromB64(code.slice(4)), new DecompressionStream('gzip')));
    else if (code.startsWith('DJ1:')) json = new TextDecoder().decode(fromB64(code.slice(4)));
    else return null;
    return migrate(JSON.parse(json));
  } catch {
    return null;
  }
}
