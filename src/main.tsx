import { render } from 'preact';
import './ui/styles.css';
import { App } from './ui/App';
import * as store from './ui/store';

render(<App />, document.getElementById('app')!);

// 開發模式：方便在主控台檢查遊戲狀態
if (import.meta.env.DEV) (window as unknown as { __dawn: typeof store }).__dawn = store;
