import type { ClassId, AdvId } from '@/core/types';
import { SAVE_KEY, clearState } from './storage';

/**
 * 本機帳號：這個瀏覽器可以有多個帳號，每個帳號最多 2 個角色。
 * 角色彼此完全獨立（各自一份存檔），帳號只是把角色分組。
 * 帳號清單存在 ACCOUNTS_KEY；角色存檔各自一個 key（第一個舊存檔沿用 SAVE_KEY）。
 */
export const ACCOUNTS_KEY = 'dawnland-accounts';
export const MAX_CHARS = 2;

export interface Account {
  id: string;
  name: string;
  createdAt: number;
  /** 角色存檔的 key，null = 空位 */
  slots: (string | null)[];
}

export interface AccountIndex {
  accounts: Account[];
  /** 上次玩的角色 */
  last: { account: string; slot: number } | null;
}

export interface CharSummary {
  name: string;
  classId: ClassId;
  advId: AdvId | null;
  level: number;
  rebirths: number;
  lastSeen: number;
  /** 各難度已通關的最高關卡 */
  best: number[];
  difficulty: number;
}

const uid = (p: string) => p + Date.now().toString(36) + Math.random().toString(36).slice(2, 7);

function read(): AccountIndex | null {
  try {
    const raw = localStorage.getItem(ACCOUNTS_KEY);
    if (!raw) return null;
    const v = JSON.parse(raw) as AccountIndex;
    if (!Array.isArray(v.accounts)) return null;
    for (const a of v.accounts) a.slots = Array.from({ length: MAX_CHARS }, (_, i) => a.slots?.[i] ?? null);
    return v;
  } catch {
    return null;
  }
}

export function saveIndex(idx: AccountIndex) {
  try { localStorage.setItem(ACCOUNTS_KEY, JSON.stringify(idx)); } catch { /* 無法存取儲存空間 */ }
}

/** 讀取帳號清單；第一次使用新版時，把舊存檔放進「帳號 1」的第一個角色位 */
export function loadIndex(): AccountIndex {
  const idx = read();
  if (idx) return idx;
  let legacy = false;
  try { legacy = !!localStorage.getItem(SAVE_KEY); } catch { /* 無法存取儲存空間 */ }
  const out: AccountIndex = legacy
    ? { accounts: [{ id: 'a1', name: '帳號 1', createdAt: Date.now(), slots: [SAVE_KEY, null] }], last: { account: 'a1', slot: 0 } }
    : { accounts: [], last: null };
  saveIndex(out);
  return out;
}

export function createAccount(idx: AccountIndex, name: string): Account {
  const a: Account = { id: uid('a'), name: name.trim() || `帳號 ${idx.accounts.length + 1}`, createdAt: Date.now(), slots: Array(MAX_CHARS).fill(null) };
  idx.accounts.push(a);
  saveIndex(idx);
  return a;
}

export function renameAccount(idx: AccountIndex, id: string, name: string) {
  const a = idx.accounts.find(x => x.id === id);
  if (!a || !name.trim()) return;
  a.name = name.trim();
  saveIndex(idx);
}

/** 刪除帳號：連同底下的角色存檔一起刪除 */
export function deleteAccount(idx: AccountIndex, id: string) {
  const a = idx.accounts.find(x => x.id === id);
  if (!a) return;
  for (const k of a.slots) if (k) clearState(k);
  idx.accounts = idx.accounts.filter(x => x.id !== id);
  if (idx.last?.account === id) idx.last = null;
  saveIndex(idx);
}

/** 為空位配一個新的存檔 key（第一個角色若是空的，優先沿用舊版位置，避免占用新 key） */
export function newSaveKey(idx: AccountIndex): string {
  const used = new Set(idx.accounts.flatMap(a => a.slots));
  let legacyFree = !used.has(SAVE_KEY);
  try { if (legacyFree && localStorage.getItem(SAVE_KEY)) legacyFree = false; } catch { legacyFree = false; }
  return legacyFree ? SAVE_KEY : uid(SAVE_KEY + ':c:');
}

export function setSlot(idx: AccountIndex, accountId: string, slot: number, key: string | null) {
  const a = idx.accounts.find(x => x.id === accountId);
  if (!a) return;
  a.slots[slot] = key;
  saveIndex(idx);
}

/** 刪除角色：清掉存檔並空出位置 */
export function deleteChar(idx: AccountIndex, accountId: string, slot: number) {
  const a = idx.accounts.find(x => x.id === accountId);
  const key = a?.slots[slot];
  if (!a || !key) return;
  clearState(key);
  a.slots[slot] = null;
  if (idx.last?.account === accountId && idx.last.slot === slot) idx.last = null;
  saveIndex(idx);
}

export function markLast(idx: AccountIndex, accountId: string, slot: number) {
  idx.last = { account: accountId, slot };
  saveIndex(idx);
}

/** 角色卡片要顯示的摘要（直接讀存檔，不跑遷移） */
export function summarize(key: string): CharSummary | null {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return null;
    const s = JSON.parse(raw);
    return {
      name: s.hero?.name ?? '？', classId: s.hero?.classId, advId: s.hero?.advId ?? null, level: s.hero?.level ?? 1,
      rebirths: s.rebirth?.count ?? 0, lastSeen: s.lastSeen ?? 0, best: s.progress?.best ?? [-1], difficulty: s.progress?.difficulty ?? 0,
    };
  } catch {
    return null;
  }
}
