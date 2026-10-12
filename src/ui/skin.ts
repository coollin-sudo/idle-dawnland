import { effect } from '@preact/signals';
import { artUrl, artVersion } from '@/render/images';

/**
 * 介面外框美術（public/art/skin）：面板框、戰鬥畫面框、頂部列、背景與底紋。
 * 圖片都在時，<html> 加上 .skin 並設定 CSS 變數；關閉美術圖或缺圖時退回原本的純色樣式。
 */
const PARTS = { frame: 'frame_a', 'frame-b': 'frame_b', bar: 'bar', bg: 'bg', tex: 'tex' } as const;

export function applySkin() {
  if (typeof document === 'undefined') return;
  const root = document.documentElement;
  const urls = Object.entries(PARTS).map(([k, f]) => [k, artUrl(`art/skin/${f}`)] as const);
  if (urls.some(([, u]) => !u)) { root.classList.remove('skin'); return; }
  for (const [k, u] of urls) root.style.setProperty(`--skin-${k}`, `url("${u}")`);
  root.classList.add('skin');
}

effect(() => { void artVersion.value; applySkin(); });
