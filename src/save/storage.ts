import { newGameState, SAVE_VERSION, defaultSettings } from '@/core/state';
import { signText } from './sign';
import { baseSockets, maxSockets } from '@/data/jewels';
import { EXCLUSIVE_TIERS, TALENT_TREES } from '@/data/talents';
import { STAR_NODES, starCost } from '@/data/meta';
import type { GameState } from '@/core/types';

export const SAVE_KEY = 'dawnland-v2';
const SIG_KEY = SAVE_KEY + ':sig';
/** 這個瀏覽器已經開始使用簽章（之後缺少簽章就視為被修改） */
const SIGNED_KEY = SAVE_KEY + ':signed';

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
  // 天賦互斥層：舊存檔若同層點了多個，只保留點數最多的（其餘點數自動退回）
  const tree = TALENT_TREES[s.hero.classId];
  for (const tier of EXCLUSIVE_TIERS) {
    const picked = tree.nodes.filter(n => n.tier === tier && (s.hero.talentRanks[n.id] ?? 0) > 0)
      .sort((a, b) => (s.hero.talentRanks[b.id] ?? 0) - (s.hero.talentRanks[a.id] ?? 0));
    for (const n of picked.slice(1)) delete s.hero.talentRanks[n.id];
  }
  if (!s.rebirth.soulsEarned) {
    let spent = 0;
    for (const n of STAR_NODES) for (let r = 0; r < (s.rebirth.ranks[n.id] ?? 0); r++) spent += starCost(n, r);
    s.rebirth.soulsEarned = spent + (s.cur.starSouls ?? 0);
  }
  // 舊存檔：最遠進度
  s.records.bestEff = Math.max(s.records.bestEff ?? -1, s.rebirth.bestStageEver ?? -1, ...s.progress.best.map((b, d) => (b >= 0 ? d * 80 + b : -1)));
  // 舊存檔：到過的最高等級（轉生後回到這個等級前用快速升級曲線）
  s.hero.maxLevel = Math.max(s.hero.maxLevel ?? 1, s.hero.level, s.counters?.maxLevel ?? 1);
  if (!Array.isArray(s.hero.loadoutHold)) s.hero.loadoutHold = [false, false, false, false];
  // 鑲嵌孔改版：依部位與稀有度補足保底孔數；超過新上限的孔先拿掉空孔，仍超過就把魔晶退回魔晶袋
  const allItems = [...s.inventory, ...Object.values(s.equipment), ...Object.values(s.gear?.alt ?? {})].filter((x): x is NonNullable<typeof x> => !!x);
  for (const it of allItems) {
    const max = maxSockets(it.slot, it.rarity);
    const base = baseSockets(it.slot, it.rarity);
    let sk = it.sockets ?? [];
    while (sk.length > max && sk.includes(null)) sk.splice(sk.lastIndexOf(null), 1);
    while (sk.length > max) { const k = sk.pop(); if (k) s.jewels[k] = (s.jewels[k] ?? 0) + 1; }
    while (sk.length < base) sk.push(null);
    it.sockets = sk.length ? sk : undefined;
  }
  s.version = SAVE_VERSION;
  return s;
}

export function loadState(): GameState | null {
  try {
    const raw = localStorage.getItem(SAVE_KEY);
    if (!raw) return null;
    const s = migrate(JSON.parse(raw));
    if (!s) return null;
    const sig = localStorage.getItem(SIG_KEY);
    if (sig ? sig !== signText(raw) : !!localStorage.getItem(SIGNED_KEY)) s.online.tainted = true;
    return s;
  } catch {
    return null;
  }
}

export function saveState(s: GameState): boolean {
  try {
    s.lastSeen = Date.now();
    const json = JSON.stringify(s);
    localStorage.setItem(SAVE_KEY, json);
    localStorage.setItem(SIG_KEY, signText(json));
    localStorage.setItem(SIGNED_KEY, '1');
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

/** 匯出成 JSON 檔：回傳檔名與內容 */
export function exportJson(s: GameState, now = new Date()): { filename: string; blob: Blob } {
  const pad = (n: number) => String(n).padStart(2, '0');
  const date = `${now.getFullYear()}${pad(now.getMonth() + 1)}${pad(now.getDate())}-${pad(now.getHours())}${pad(now.getMinutes())}`;
  const safeName = s.hero.name.replace(/[\\/:*?"<>|\s]+/g, '_').slice(0, 20) || 'hero';
  const filename = `晨曦大陸_${safeName}_Lv${s.hero.level}_${date}.json`;
  const save = JSON.stringify(s);
  const text = `{"game":"idle-dawnland","exportedAt":${JSON.stringify(now.toISOString())},"sig":"${signText(save)}","save":${save}}`;
  const blob = new Blob([text], { type: 'application/json' });
  return { filename, blob };
}

/** 匯入：支援 JSON 檔內容，也相容舊的存檔碼（DZ1:/DJ1:） */
export async function importText(text: string): Promise<GameState | null> {
  const t = text.trim().replace(/^\uFEFF/, '');
  if (!t.startsWith('{')) {
    // 舊版存檔碼沒有簽章：可以玩，但不能參加排行榜
    const s = await importCode(t);
    if (s) s.online.tainted = true;
    return s;
  }
  try {
    const data = JSON.parse(t) as { save?: unknown; sig?: string };
    const wrapped = data && typeof data === 'object' && 'save' in data;
    const s = migrate(wrapped ? data.save : data);
    if (s && (!wrapped || !data.sig || data.sig !== signText(JSON.stringify(data.save)))) s.online.tainted = true;
    return s;
  } catch {
    return null;
  }
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
