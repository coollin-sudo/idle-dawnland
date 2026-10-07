import type { BackgroundTheme } from '@/core/types';
import { alpha, ellipse, glow, hash, shade, type Ctx } from './draw';
import { getImage } from './images';

export const VIEW_W = 960;
export const VIEW_H = 420;
export const GROUND_Y = 336;

type LayerKind = BackgroundTheme['layers'][number];

interface Layer {
  canvas: HTMLCanvasElement;
  speed: number;
  y: number;
}

function makeCanvas(w: number, h: number) {
  const c = document.createElement('canvas');
  c.width = w;
  c.height = h;
  return c;
}

/** 某一層的剪影，寬度 = 2 × VIEW_W，左右可無縫拼接 */
function paintLayer(ctx: Ctx, kind: LayerKind, color: string, w: number, h: number, seed: number, theme: BackgroundTheme) {
  const r = (i: number) => hash(seed * 97 + i);
  ctx.fillStyle = color;
  switch (kind) {
    case 'hills': {
      ctx.beginPath();
      ctx.moveTo(0, h);
      for (let x = 0; x <= w; x += 8) {
        const k = (x / w) * Math.PI * 2;
        const y = h * 0.45 + Math.sin(k * 2 + seed) * 22 + Math.sin(k * 5 + seed * 2) * 10 + Math.sin(k * 11) * 4;
        ctx.lineTo(x, y);
      }
      ctx.lineTo(w, h);
      ctx.closePath();
      ctx.fill();
      break;
    }
    case 'mountains': {
      ctx.beginPath();
      ctx.moveTo(0, h);
      const peaks = 9;
      const pts: [number, number][] = [];
      for (let i = 0; i <= peaks * 2; i++) {
        const x = (i / (peaks * 2)) * w;
        const y = i % 2 === 0 ? h * (0.55 + r(i) * 0.15) : h * (0.08 + r(i) * 0.25);
        pts.push([x, y]);
      }
      pts[pts.length - 1][1] = pts[0][1];
      for (const [x, y] of pts) ctx.lineTo(x, y);
      ctx.lineTo(w, h);
      ctx.closePath();
      ctx.fill();
      // 積雪
      ctx.fillStyle = alpha('#ffffff', theme.particles === 'snow' ? 0.85 : 0.25);
      for (let i = 1; i < pts.length; i += 2) {
        const [x, y] = pts[i];
        const [lx, ly] = pts[i - 1];
        const [rx, ry] = pts[i + 1] ?? pts[i - 1];
        ctx.beginPath();
        ctx.moveTo(x, y);
        ctx.lineTo(x + (lx - x) * 0.22, y + (ly - y) * 0.22);
        ctx.lineTo(x + (lx - x) * 0.1, y + (ly - y) * 0.3);
        ctx.lineTo(x, y + 18);
        ctx.lineTo(x + (rx - x) * 0.12, y + (ry - y) * 0.3);
        ctx.lineTo(x + (rx - x) * 0.22, y + (ry - y) * 0.22);
        ctx.closePath();
        ctx.fill();
      }
      break;
    }
    case 'trees': {
      const n = 22;
      for (let i = 0; i < n; i++) {
        const x = (i / n) * w + r(i) * 30;
        const base = h * (0.82 + r(i + 50) * 0.1);
        const s = 0.7 + r(i + 9) * 0.6;
        ctx.fillStyle = shade(color, -0.25);
        ctx.fillRect(x - 3 * s, base - 30 * s, 6 * s, 34 * s);
        ctx.fillStyle = color;
        for (const [dx, dy, rr] of [[0, -44, 22], [-14, -32, 16], [14, -32, 16]] as const) {
          ellipse(ctx, x + dx * s, base + dy * s, rr * s, rr * s * 0.9);
          ctx.fill();
        }
      }
      ctx.fillRect(0, h * 0.88, w, h);
      break;
    }
    case 'pines': {
      const n = 30;
      for (let i = 0; i < n; i++) {
        const x = (i / n) * w + r(i) * 26;
        const base = h * (0.85 + r(i + 30) * 0.1);
        const s = 0.6 + r(i + 7) * 0.7;
        ctx.fillStyle = shade(color, -0.3);
        ctx.fillRect(x - 2.5 * s, base - 12 * s, 5 * s, 14 * s);
        ctx.fillStyle = color;
        for (let k = 0; k < 3; k++) {
          ctx.beginPath();
          ctx.moveTo(x - (20 - k * 5) * s, base - (10 + k * 18) * s);
          ctx.lineTo(x, base - (42 + k * 18) * s);
          ctx.lineTo(x + (20 - k * 5) * s, base - (10 + k * 18) * s);
          ctx.closePath();
          ctx.fill();
        }
        if (theme.particles === 'snow') {
          ctx.fillStyle = alpha('#ffffff', 0.8);
          ctx.beginPath();
          ctx.moveTo(x - 5 * s, base - 70 * s);
          ctx.lineTo(x, base - 78 * s);
          ctx.lineTo(x + 5 * s, base - 70 * s);
          ctx.fill();
          ctx.fillStyle = color;
        }
      }
      ctx.fillRect(0, h * 0.9, w, h);
      break;
    }
    case 'rocks': {
      // 天花板鐘乳石 + 地面岩塊
      for (let i = 0; i < 26; i++) {
        const x = (i / 26) * w + r(i) * 20;
        const len = 30 + r(i + 3) * 80;
        ctx.beginPath();
        ctx.moveTo(x - 14, 0);
        ctx.lineTo(x, len);
        ctx.lineTo(x + 14, 0);
        ctx.fill();
      }
      ctx.fillRect(0, 0, w, 18);
      for (let i = 0; i < 18; i++) {
        const x = (i / 18) * w + r(i + 40) * 30;
        const rr = 20 + r(i + 60) * 40;
        ellipse(ctx, x, h - 4, rr, rr * 0.7);
        ctx.fill();
      }
      break;
    }
    case 'crystals': {
      for (let i = 0; i < 14; i++) {
        const x = (i / 14) * w + r(i) * 40;
        const base = h * (0.88 + r(i + 5) * 0.08);
        const s = 0.6 + r(i + 2) * 0.9;
        const c = theme.particles === 'motes' ? '#b67bff' : '#7ad8ff';
        for (let k = -1; k <= 1; k++) {
          ctx.save();
          ctx.translate(x + k * 8 * s, base);
          ctx.rotate(k * 0.35);
          const grd = ctx.createLinearGradient(0, -50 * s, 0, 0);
          grd.addColorStop(0, alpha(c, 0.95));
          grd.addColorStop(1, alpha(shade(c, -0.5), 0.9));
          ctx.fillStyle = grd;
          ctx.beginPath();
          ctx.moveTo(-6 * s, 0);
          ctx.lineTo(-5 * s, -(30 + k * k * -10) * s);
          ctx.lineTo(0, -(44 - Math.abs(k) * 14) * s);
          ctx.lineTo(5 * s, -(30 + k * k * -10) * s);
          ctx.lineTo(6 * s, 0);
          ctx.fill();
          ctx.restore();
        }
        glow(ctx, x, base - 20 * s, 34 * s, c, 0.25);
      }
      break;
    }
    case 'pillars': {
      for (let i = 0; i < 8; i++) {
        const x = (i / 8) * w + r(i) * 60;
        const base = h * 0.95;
        const ph = 60 + r(i + 1) * 90;
        const broken = r(i + 2) > 0.5;
        ctx.fillStyle = color;
        ctx.fillRect(x - 13, base - ph, 26, ph);
        ctx.fillRect(x - 18, base - ph - 8, 36, 10);
        ctx.fillRect(x - 18, base - 8, 36, 8);
        ctx.fillStyle = shade(color, -0.2);
        for (let k = 0; k < 3; k++) ctx.fillRect(x - 9 + k * 7, base - ph + 4, 2, ph - 12);
        if (broken) {
          ctx.fillStyle = color;
          ctx.beginPath();
          ctx.moveTo(x - 18, base - ph - 8);
          ctx.lineTo(x - 6, base - ph - 22);
          ctx.lineTo(x + 4, base - ph - 10);
          ctx.lineTo(x + 18, base - ph - 16);
          ctx.lineTo(x + 18, base - ph);
          ctx.fill();
        }
      }
      break;
    }
    case 'dunes': {
      ctx.beginPath();
      ctx.moveTo(0, h);
      for (let x = 0; x <= w; x += 8) {
        const k = (x / w) * Math.PI * 2;
        ctx.lineTo(x, h * 0.55 + Math.sin(k * 3 + seed) * 18 + Math.sin(k * 7) * 6);
      }
      ctx.lineTo(w, h);
      ctx.closePath();
      ctx.fill();
      break;
    }
    case 'spikes': {
      for (let i = 0; i < 20; i++) {
        const x = (i / 20) * w + r(i) * 30;
        const ph = 40 + r(i + 4) * 120;
        ctx.beginPath();
        ctx.moveTo(x - 24, h);
        ctx.lineTo(x - 4, h - ph);
        ctx.lineTo(x + 2, h - ph + 10);
        ctx.lineTo(x + 24, h);
        ctx.fill();
        if (r(i + 8) > 0.6) {
          ctx.strokeStyle = alpha('#ff6a2a', 0.7);
          ctx.lineWidth = 2;
          ctx.beginPath();
          ctx.moveTo(x - 2, h - ph + 12);
          ctx.lineTo(x - 8, h - ph * 0.5);
          ctx.lineTo(x - 2, h - 10);
          ctx.stroke();
        }
      }
      break;
    }
    case 'clouds': {
      for (let i = 0; i < 12; i++) {
        const x = (i / 12) * w + r(i) * 50;
        const y = h * (0.3 + r(i + 3) * 0.5);
        const s = 0.6 + r(i + 1) * 0.9;
        ctx.fillStyle = alpha(color, 0.95);
        for (const [dx, dy, rr] of [[0, 0, 30], [-28, 8, 22], [28, 8, 24], [12, -12, 22], [-14, -8, 18]] as const) {
          ellipse(ctx, x + dx * s, y + dy * s, rr * s, rr * s * 0.8);
          ctx.fill();
        }
      }
      break;
    }
    case 'towers': {
      for (let i = 0; i < 5; i++) {
        const x = (i / 5) * w + r(i) * 80 + 40;
        const y = h * (0.35 + r(i + 2) * 0.3);
        ctx.fillStyle = shade(color, -0.12);
        ctx.beginPath();
        ctx.moveTo(x - 60, y);
        ctx.lineTo(x + 60, y);
        ctx.lineTo(x + 30, y + 30);
        ctx.lineTo(x, y + 50);
        ctx.lineTo(x - 30, y + 30);
        ctx.fill();
        ctx.fillStyle = color;
        for (const [dx, th, tw] of [[-30, 50, 16], [0, 80, 22], [28, 60, 16]] as const) {
          ctx.fillRect(x + dx - tw / 2, y - th, tw, th);
          ctx.beginPath();
          ctx.moveTo(x + dx - tw / 2 - 4, y - th);
          ctx.lineTo(x + dx, y - th - 22);
          ctx.lineTo(x + dx + tw / 2 + 4, y - th);
          ctx.fillStyle = '#5a7ad8';
          ctx.fill();
          ctx.fillStyle = color;
        }
      }
      break;
    }
    case 'void': {
      for (let i = 0; i < 10; i++) {
        const x = (i / 10) * w + r(i) * 60;
        const y = h * (0.2 + r(i + 1) * 0.55);
        const s = 0.5 + r(i + 4);
        ctx.fillStyle = color;
        ctx.beginPath();
        ctx.moveTo(x - 30 * s, y);
        ctx.lineTo(x + 30 * s, y - 4 * s);
        ctx.lineTo(x + 14 * s, y + 24 * s);
        ctx.lineTo(x - 4 * s, y + 34 * s);
        ctx.lineTo(x - 18 * s, y + 18 * s);
        ctx.fill();
        glow(ctx, x, y + 10 * s, 30 * s, '#8a4ad8', 0.18);
      }
      // 裂縫
      for (let i = 0; i < 4; i++) {
        const x = (i / 4) * w + r(i + 20) * 100;
        ctx.strokeStyle = alpha('#d8a8ff', 0.5);
        ctx.lineWidth = 3;
        ctx.beginPath();
        let yy = h * 0.1;
        let xx = x;
        ctx.moveTo(xx, yy);
        for (let k = 0; k < 6; k++) { xx += (r(i * 9 + k) - 0.5) * 30; yy += 20; ctx.lineTo(xx, yy); }
        ctx.stroke();
      }
      break;
    }
  }
}

/** 美術背景圖中「角色站立的地面」位於圖片高度的比例（依實際圖片微調） */
const ART_GROUND: Record<string, number> = {};
/** 美術背景的捲動速度（相對於地面） */
const ART_SPEED = 0.35;
/** 美術背景繪製高度：略高於畫面，讓天空上緣可以裁掉一點 */
const ART_H = 520;

export class Background {
  layers: Layer[] = [];
  ground!: HTMLCanvasElement;
  sky!: HTMLCanvasElement;
  /** artId：public/art/bg/ 底下的圖片名稱（通常是區域 id），有圖就改用美術背景 */
  constructor(public theme: BackgroundTheme, public seed: number, public artId?: string) {
    this.build();
  }

  private art(): HTMLImageElement | null {
    return this.artId ? getImage(`art/bg/${this.artId}`) : null;
  }

  /** 用美術圖畫背景：左右鏡像交替拼接，確保接縫連續 */
  private drawArt(ctx: Ctx, img: HTMLImageElement, scroll: number) {
    const h = ART_H;
    const w = (img.width / img.height) * h;
    const top = GROUND_Y - (ART_GROUND[this.artId!] ?? 0.72) * h;
    const period = Math.round(w) * 2;
    const off = -((scroll * ART_SPEED) % period);
    // 以整數像素對齊並多畫 1px，避免拼接處出現細縫
    const tw = Math.round(w);
    for (let x = Math.floor(off), i = 0; x < VIEW_W; x += tw, i++) {
      if (i % 2 === 0) ctx.drawImage(img, x, top, tw + 1, h);
      else {
        ctx.save();
        ctx.translate(x + tw + 1, top);
        ctx.scale(-1, 1);
        ctx.drawImage(img, 0, 0, tw + 1, h);
        ctx.restore();
      }
    }
    // 底部若圖片不足以蓋滿，補上地面色
    const bottom = top + h;
    if (bottom < VIEW_H) {
      ctx.fillStyle = this.theme.ground[1];
      ctx.fillRect(0, bottom, VIEW_W, VIEW_H - bottom);
    }
  }

  private build() {
    const W = VIEW_W * 2;
    const t = this.theme;
    // 天空
    this.sky = makeCanvas(VIEW_W, VIEW_H);
    const sc = this.sky.getContext('2d')!;
    const g = sc.createLinearGradient(0, 0, 0, GROUND_Y);
    g.addColorStop(0, t.sky[0]);
    g.addColorStop(1, t.sky[1]);
    sc.fillStyle = g;
    sc.fillRect(0, 0, VIEW_W, VIEW_H);
    if (t.sun) {
      glow(sc, VIEW_W * 0.78, 90, 160, t.sun, 0.55);
      sc.fillStyle = alpha(t.sun, 0.9);
      ellipse(sc, VIEW_W * 0.78, 90, 34, 34);
      sc.fill();
    }
    if (t.particles === 'motes' || t.particles === 'embers') {
      for (let i = 0; i < 60; i++) {
        sc.fillStyle = alpha('#ffffff', hash(i) * 0.6);
        sc.fillRect(hash(i + 1) * VIEW_W, hash(i + 2) * GROUND_Y * 0.7, 1.5, 1.5);
      }
    }
    // 遠景與中景
    const colors = [t.far, t.mid];
    const speeds = [0.12, 0.32];
    const heights = [200, 170];
    const ys = [GROUND_Y - 200 + 20, GROUND_Y - 170 + 18];
    t.layers.forEach((kind, i) => {
      if (i > 1) return;
      const c = makeCanvas(W, heights[i]);
      const ctx = c.getContext('2d')!;
      paintLayer(ctx, kind, colors[i], W, heights[i], this.seed + i * 13, t);
      // 霧化：越遠越淡
      ctx.globalCompositeOperation = 'source-atop';
      ctx.fillStyle = alpha(t.sky[1], i === 0 ? 0.35 : 0.12);
      ctx.fillRect(0, 0, W, heights[i]);
      this.layers.push({ canvas: c, speed: speeds[i], y: ys[i] });
    });
    // 地面
    this.ground = makeCanvas(W, VIEW_H - GROUND_Y + 30);
    const gc = this.ground.getContext('2d')!;
    const gh = this.ground.height;
    const gg = gc.createLinearGradient(0, 0, 0, gh);
    gg.addColorStop(0, t.ground[0]);
    gg.addColorStop(1, t.ground[1]);
    gc.fillStyle = gg;
    gc.fillRect(0, 18, W, gh);
    // 地面邊緣
    gc.fillStyle = shade(t.ground[0], 0.15);
    gc.beginPath();
    gc.moveTo(0, 22);
    for (let x = 0; x <= W; x += 12) gc.lineTo(x, 18 + Math.sin(x * 0.05) * 3 + hash(x) * 3);
    gc.lineTo(W, 30);
    gc.lineTo(0, 30);
    gc.fill();
    // 紋理
    for (let i = 0; i < 160; i++) {
      const x = hash(i * 3 + this.seed) * W;
      const y = 30 + hash(i * 5 + 1) * (gh - 30);
      gc.fillStyle = alpha(i % 2 ? shade(t.ground[1], -0.2) : shade(t.ground[0], 0.2), 0.35);
      if (t.particles === 'fireflies' || t.particles === 'leaves') {
        // 草
        gc.strokeStyle = alpha(shade(t.ground[0], 0.25), 0.7);
        gc.lineWidth = 1.5;
        gc.beginPath();
        gc.moveTo(x, y);
        gc.lineTo(x - 2, y - 6);
        gc.moveTo(x, y);
        gc.lineTo(x + 2, y - 7);
        gc.stroke();
      } else {
        ellipse(gc, x, y, 2 + hash(i) * 6, 1 + hash(i + 7) * 2.5);
        gc.fill();
      }
    }
  }

  draw(ctx: Ctx, scroll: number, t: number) {
    const img = this.art();
    if (img) {
      this.drawArt(ctx, img, scroll);
      return;
    }
    ctx.drawImage(this.sky, 0, 0);
    for (const l of this.layers) {
      const w = l.canvas.width;
      const off = -((scroll * l.speed + (this.theme.layers[0] === 'clouds' ? t * 6 : 0)) % w);
      ctx.drawImage(l.canvas, off, l.y);
      ctx.drawImage(l.canvas, off + w, l.y);
    }
    const gw = this.ground.width;
    const goff = -(scroll % gw);
    ctx.drawImage(this.ground, goff, GROUND_Y - 22);
    ctx.drawImage(this.ground, goff + gw, GROUND_Y - 22);
  }
}
