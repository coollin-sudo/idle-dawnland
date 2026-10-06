/** Canvas 繪圖小工具 */

export type Ctx = CanvasRenderingContext2D;

export const OUTLINE = '#1b1420';

export function shade(hex: string, amt: number): string {
  // amt: -1（全黑）~ 1（全白）
  const c = parseHex(hex);
  const t = amt < 0 ? 0 : 255;
  const p = Math.abs(amt);
  const r = Math.round((t - c[0]) * p + c[0]);
  const g = Math.round((t - c[1]) * p + c[1]);
  const b = Math.round((t - c[2]) * p + c[2]);
  return `rgb(${r},${g},${b})`;
}

export function alpha(hex: string, a: number): string {
  const c = parseHex(hex);
  return `rgba(${c[0]},${c[1]},${c[2]},${a})`;
}

const hexCache = new Map<string, [number, number, number]>();
export function parseHex(hex: string): [number, number, number] {
  let c = hexCache.get(hex);
  if (c) return c;
  if (hex.startsWith('rgb')) {
    const m = hex.match(/\d+/g)!.map(Number);
    c = [m[0], m[1], m[2]];
  } else {
    let h = hex.replace('#', '');
    if (h.length === 3) h = h.split('').map(x => x + x).join('');
    const n = parseInt(h, 16);
    c = [(n >> 16) & 255, (n >> 8) & 255, n & 255];
  }
  hexCache.set(hex, c);
  return c;
}

export function ellipse(ctx: Ctx, x: number, y: number, rx: number, ry: number, rot = 0) {
  ctx.beginPath();
  ctx.ellipse(x, y, Math.max(0.1, rx), Math.max(0.1, ry), rot, 0, Math.PI * 2);
}

export function rrect(ctx: Ctx, x: number, y: number, w: number, h: number, r: number) {
  ctx.beginPath();
  ctx.roundRect(x, y, w, h, Math.min(r, Math.abs(w) / 2, Math.abs(h) / 2));
}

export function fillStroke(ctx: Ctx, fill: string | CanvasGradient, lw = 2.2, stroke = OUTLINE) {
  ctx.fillStyle = fill;
  ctx.fill();
  if (lw > 0) {
    ctx.lineWidth = lw;
    ctx.strokeStyle = stroke;
    ctx.stroke();
  }
}

/** 由上往下的漸層，模擬受光 */
export function vgrad(ctx: Ctx, y0: number, y1: number, color: string, light = 0.18, dark = -0.22) {
  const g = ctx.createLinearGradient(0, y0, 0, y1);
  g.addColorStop(0, shade(color, light));
  g.addColorStop(1, shade(color, dark));
  return g;
}

export function rgrad(ctx: Ctx, x: number, y: number, r: number, inner: string, outer: string) {
  const g = ctx.createRadialGradient(x, y, 0, x, y, r);
  g.addColorStop(0, inner);
  g.addColorStop(1, outer);
  return g;
}

export function glow(ctx: Ctx, x: number, y: number, r: number, color: string, a = 0.6) {
  const g = ctx.createRadialGradient(x, y, 0, x, y, r);
  g.addColorStop(0, alpha(color, a));
  g.addColorStop(1, alpha(color, 0));
  ctx.fillStyle = g;
  ctx.beginPath();
  ctx.arc(x, y, r, 0, Math.PI * 2);
  ctx.fill();
}

export function shadow(ctx: Ctx, x: number, y: number, w: number) {
  ctx.fillStyle = 'rgba(0,0,0,0.28)';
  ellipse(ctx, x, y, w, w * 0.22);
  ctx.fill();
}

/** 卡通眼睛 */
export function eye(ctx: Ctx, x: number, y: number, r: number, color = '#1b1420', look = 0.3, blink = false) {
  if (blink) {
    ctx.strokeStyle = color;
    ctx.lineWidth = Math.max(1.5, r * 0.4);
    ctx.beginPath();
    ctx.moveTo(x - r, y);
    ctx.quadraticCurveTo(x, y + r * 0.6, x + r, y);
    ctx.stroke();
    return;
  }
  ctx.fillStyle = color;
  ellipse(ctx, x, y, r * 0.8, r);
  ctx.fill();
  ctx.fillStyle = '#fff';
  ellipse(ctx, x + r * look * 0.6, y - r * 0.4, r * 0.32, r * 0.36);
  ctx.fill();
}

/** 發光眼（怪物用） */
export function glowEye(ctx: Ctx, x: number, y: number, r: number, color: string) {
  glow(ctx, x, y, r * 3, color, 0.5);
  ctx.fillStyle = shade(color, 0.5);
  ellipse(ctx, x, y, r, r * 0.8);
  ctx.fill();
}

export function star(ctx: Ctx, x: number, y: number, r: number, points = 5, inner = 0.45) {
  ctx.beginPath();
  for (let i = 0; i < points * 2; i++) {
    const a = (i / (points * 2)) * Math.PI * 2 - Math.PI / 2;
    const rr = i % 2 === 0 ? r : r * inner;
    ctx.lineTo(x + Math.cos(a) * rr, y + Math.sin(a) * rr);
  }
  ctx.closePath();
}

export const easeOut = (t: number) => 1 - (1 - t) * (1 - t);
export const easeIn = (t: number) => t * t;
export const easeInOut = (t: number) => (t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2);
export const clamp01 = (t: number) => Math.max(0, Math.min(1, t));
export const lerp = (a: number, b: number, t: number) => a + (b - a) * t;

/** 決定性的雜訊：給背景產生固定形狀 */
export function hash(n: number) {
  const x = Math.sin(n * 127.1 + 311.7) * 43758.5453;
  return x - Math.floor(x);
}
