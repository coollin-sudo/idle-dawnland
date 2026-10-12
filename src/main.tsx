import { render } from 'preact';
import './ui/styles.css';
import { App } from './ui/App';
import * as store from './ui/store';
import { Capacitor } from '@capacitor/core';

render(<App />, document.getElementById('app')!);

// 遊戲畫面不縮放：iOS Safari 會忽略 user-scalable=no，雙指縮放要另外擋（連點放大由 CSS touch-action 處理，不會吃掉快速連點的按鈕）
if (typeof document !== 'undefined') {
  for (const ev of ['gesturestart', 'gesturechange', 'gestureend']) document.addEventListener(ev, e => e.preventDefault(), { passive: false });
}

// 開發模式：方便在主控台檢查遊戲狀態
if (import.meta.env.DEV) (window as unknown as { __dawn: typeof store }).__dawn = store;

// 正式版（網頁）註冊離線快取；App 版的檔案已經在手機裡，不需要
if (import.meta.env.PROD && !Capacitor.isNativePlatform() && 'serviceWorker' in navigator) {
  window.addEventListener('load', () => { void navigator.serviceWorker.register('./sw.js'); });
}
