import { signal } from '@preact/signals';
import type { ComponentChildren } from 'preact';
import { Game } from '@/core/game';
import type { GameEvents } from '@/core/gameEvents';
import type { GameState, Item } from '@/core/types';
import { setNumberStyle } from '@/core/format';
import { setArtEnabled } from '@/render/images';
import { applyOffline, type OfflineReport } from '@/systems/offline';
import { saveState } from '@/save/storage';
import { audio } from '@/audio/audio';
import { bindAudio } from '@/audio/bindings';
import type { BattleScene } from '@/render/scene';

export type TabId = 'hero' | 'bag' | 'skills' | 'talents' | 'forge' | 'pets' | 'map' | 'challenge' | 'shop' | 'quests' | 'collection' | 'rebirth' | 'settings';

export const game = signal<Game | null>(null);
export const uiTick = signal(0);
export const tab = signal<TabId>('hero');
export const toasts = signal<{ id: number; text: string; kind: string; icon?: string; out?: boolean }[]>([]);
export const logs = signal<{ id: number; t: string; text: string; kind?: string }[]>([]);
export const modal = signal<null | (() => ComponentChildren)>(null);
export const storyQueue = signal<string[]>([]);
export const offlineReport = signal<OfflineReport | null>(null);
export const tip = signal<{ item: Item; x: number; y: number; compare?: boolean } | null>(null);
export const selectedItem = signal<number | null>(null);
export const forgeItem = signal<number | null>(null);
tab.subscribe(() => { tip.value = null; });

let scene: BattleScene | null = null;
let raf = 0;
let lastFrame = 0;
let lastUi = 0;
let lastSave = 0;
let unbinds: (() => void)[] = [];
let seq = 1;

export const setScene = (s: BattleScene | null) => { scene = s; };
export const getScene = () => scene;
export const g = () => game.value!;
/** 讓 UI 立刻重繪 */
export const refresh = () => { uiTick.value++; };

function pushToast(e: GameEvents['toast']) {
  const id = seq++;
  const list = [...toasts.value, { id, text: e.text, kind: e.kind ?? 'info', icon: e.icon }].slice(-5);
  toasts.value = list;
  setTimeout(() => { toasts.value = toasts.value.map(t => (t.id === id ? { ...t, out: true } : t)); }, 2800);
  setTimeout(() => { toasts.value = toasts.value.filter(t => t.id !== id); }, 3300);
  pushLog(e.text, e.kind, e.icon);
}

function pushLog(text: string, kind?: string, icon?: string) {
  const d = new Date();
  const t = `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
  logs.value = [{ id: seq++, t, text: (icon ? icon + ' ' : '') + text, kind }, ...logs.value].slice(0, 80);
}

export function startGame(state: GameState, opts: { offline?: boolean } = {}) {
  stopGame();
  const gm = new Game(state);
  game.value = gm;
  setNumberStyle(state.settings.numberStyle);
  setArtEnabled(state.settings.useArt);
  audio.setVolumes(state.settings.sfx, state.settings.music);
  unbinds.push(gm.ev.on('toast', pushToast));
  unbinds.push(gm.ev.on('log', e => pushLog(e.text, e.kind)));
  unbinds.push(gm.ev.on('story', e => { storyQueue.value = [...storyQueue.value, e.id]; }));
  unbinds.push(gm.ev.on('quest:complete', () => refresh()));
  unbinds.push(bindAudio(gm));
  if (scene) scene.bind(gm);
  if (opts.offline) {
    const away = Date.now() - state.lastSeen;
    const rep = applyOffline(gm, away);
    if (rep && rep.counted >= 60_000) offlineReport.value = rep;
  }
  lastFrame = performance.now();
  raf = requestAnimationFrame(loop);
}

export function stopGame() {
  cancelAnimationFrame(raf);
  unbinds.forEach(u => u());
  unbinds = [];
}

function loop(now: number) {
  raf = requestAnimationFrame(loop);
  const gm = game.value;
  if (!gm) return;
  let dt = now - lastFrame;
  lastFrame = now;
  if (dt > 60_000) {
    // 分頁在背景很久：用離線結算
    const rep = applyOffline(gm, dt);
    if (rep) offlineReport.value = rep;
    dt = 0;
  }
  gm.advance(Math.min(dt, 60_000));
  scene?.frame(Math.min(dt, 100) / 1000);
  if (now - lastUi > 200) {
    lastUi = now;
    uiTick.value++;
  }
  if (now - lastSave > 15_000) {
    lastSave = now;
    saveState(gm.state);
  }
}

export function saveNow() {
  const gm = game.value;
  if (gm) saveState(gm.state);
}

export function openModal(render: () => ComponentChildren) {
  modal.value = render;
}
export function closeModal() {
  modal.value = null;
}

if (typeof window !== 'undefined') {
  window.addEventListener('pagehide', saveNow);
  document.addEventListener('visibilitychange', () => {
    if (document.hidden) saveNow();
  });
  const unlock = () => audio.unlock();
  window.addEventListener('pointerdown', unlock, { passive: true });
  window.addEventListener('keydown', unlock);
}
