import { render } from 'preact';
import './ui/styles.css';
import { App } from './ui/App';
import * as store from './ui/store';
import { Capacitor } from '@capacitor/core';

render(<App />, document.getElementById('app')!);

// 開發模式：方便在主控台檢查遊戲狀態
if (import.meta.env.DEV) (window as unknown as { __dawn: typeof store }).__dawn = store;

// 正式版（網頁）註冊離線快取；App 版的檔案已經在手機裡，不需要
if (import.meta.env.PROD && !Capacitor.isNativePlatform() && 'serviceWorker' in navigator) {
  window.addEventListener('load', () => { void navigator.serviceWorker.register('./sw.js'); });
}
