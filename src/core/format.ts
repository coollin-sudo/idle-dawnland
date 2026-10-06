export type NumberStyle = 'zh' | 'short' | 'full';

let style: NumberStyle = 'zh';
export const setNumberStyle = (s: NumberStyle) => { style = s; };

const ZH_UNITS: [number, string][] = [[1e16, '京'], [1e12, '兆'], [1e8, '億'], [1e4, '萬']];
const SHORT_UNITS: [number, string][] = [[1e15, 'Q'], [1e12, 'T'], [1e9, 'B'], [1e6, 'M'], [1e3, 'K']];

/** 數字格式化：中文萬/億、英文 K/M 或完整數字 */
export function fmt(n: number): string {
  if (!Number.isFinite(n)) return '∞';
  const neg = n < 0;
  n = Math.abs(n);
  let out: string;
  if (style === 'full' || n < 1e4) {
    out = Math.floor(n).toLocaleString('en-US');
  } else {
    const units = style === 'zh' ? ZH_UNITS : SHORT_UNITS;
    const threshold = style === 'zh' ? 1e5 : 1e4;
    if (n < threshold) out = Math.floor(n).toLocaleString('en-US');
    else {
      const [div, u] = units.find(([d]) => n >= d)!;
      const v = n / div;
      out = (v >= 100 ? v.toFixed(0) : v >= 10 ? v.toFixed(1) : v.toFixed(2)) + u;
    }
  }
  return neg ? '−' + out : out;
}

export const fmtPct = (v: number, digits = 1) => `${v.toFixed(digits)}%`;

export function fmtDuration(ms: number): string {
  const s = Math.max(0, Math.floor(ms / 1000));
  const d = Math.floor(s / 86400), h = Math.floor((s % 86400) / 3600), m = Math.floor((s % 3600) / 60), sec = s % 60;
  if (d) return `${d} 天 ${h} 小時`;
  if (h) return `${h} 小時 ${m} 分`;
  if (m) return `${m} 分 ${sec} 秒`;
  return `${sec} 秒`;
}

export function fmtClock(ms: number): string {
  const s = Math.max(0, Math.ceil(ms / 1000));
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
}

export const todayKey = (t = Date.now()) => {
  const d = new Date(t);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};
