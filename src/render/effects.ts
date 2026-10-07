import { ELEMENT_COLOR, type Element } from '@/core/stats';
import { alpha, clamp01, easeIn, easeOut, ellipse, glow, lerp, shade, star, type Ctx } from './draw';
import { vfxImage } from './images';

// =====================================================================
// 粒子
// =====================================================================
export type PShape = 'circle' | 'spark' | 'square' | 'star' | 'coin' | 'leaf' | 'snow' | 'smoke' | 'shard';

export interface Particle {
  x: number; y: number; vx: number; vy: number;
  life: number; max: number; size: number; color: string;
  gravity: number; drag: number; shape: PShape; additive: boolean; rot: number; vr: number;
  /** 飛向目標（金幣飛向 HUD） */
  tx?: number; ty?: number;
}

export class Particles {
  list: Particle[] = [];
  cap = 900;
  density = 1;

  emit(p: Partial<Particle> & { x: number; y: number }) {
    if (this.list.length >= this.cap) return;
    this.list.push({
      vx: 0, vy: 0, life: 0, max: 0.8, size: 3, color: '#fff', gravity: 0, drag: 0.98,
      shape: 'circle', additive: false, rot: Math.random() * 6, vr: (Math.random() - 0.5) * 6, ...p,
    });
  }

  burst(x: number, y: number, n: number, o: Partial<Particle> & { speed?: number; spread?: number; angle?: number } = {}) {
    const count = Math.round(n * this.density);
    const speed = o.speed ?? 160;
    const spread = o.spread ?? Math.PI * 2;
    const angle = o.angle ?? -Math.PI / 2;
    for (let i = 0; i < count; i++) {
      const a = angle + (Math.random() - 0.5) * spread;
      const sp = speed * (0.3 + Math.random() * 0.8);
      this.emit({ ...o, x, y, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp, max: (o.max ?? 0.7) * (0.6 + Math.random() * 0.6), size: (o.size ?? 3) * (0.6 + Math.random() * 0.8) });
    }
  }

  update(dt: number) {
    const L = this.list;
    let w = 0;
    for (let i = 0; i < L.length; i++) {
      const p = L[i];
      p.life += dt;
      if (p.life >= p.max) continue;
      if (p.tx !== undefined && p.ty !== undefined && p.life > 0.25) {
        const k = Math.min(1, dt * 7);
        p.x += (p.tx - p.x) * k;
        p.y += (p.ty - p.y) * k;
      } else {
        p.vy += p.gravity * dt;
        p.vx *= Math.pow(p.drag, dt * 60);
        p.vy *= Math.pow(p.drag, dt * 60);
        p.x += p.vx * dt;
        p.y += p.vy * dt;
      }
      p.rot += p.vr * dt;
      L[w++] = p;
    }
    L.length = w;
  }

  draw(ctx: Ctx) {
    for (const additive of [false, true]) {
      ctx.globalCompositeOperation = additive ? 'lighter' : 'source-over';
      for (const p of this.list) {
        if (p.additive !== additive) continue;
        const k = p.life / p.max;
        const a = k < 0.15 ? k / 0.15 : 1 - easeIn((k - 0.15) / 0.85);
        ctx.globalAlpha = Math.max(0, a);
        const s = p.size * (p.shape === 'smoke' ? 1 + k * 2 : 1);
        switch (p.shape) {
          case 'circle':
          case 'smoke':
            ctx.fillStyle = p.color;
            ctx.beginPath();
            ctx.arc(p.x, p.y, s, 0, Math.PI * 2);
            ctx.fill();
            break;
          case 'spark': {
            ctx.strokeStyle = p.color;
            ctx.lineWidth = Math.max(1, s * 0.6);
            ctx.beginPath();
            ctx.moveTo(p.x, p.y);
            ctx.lineTo(p.x - p.vx * 0.04, p.y - p.vy * 0.04);
            ctx.stroke();
            break;
          }
          case 'square':
          case 'shard':
            ctx.save();
            ctx.translate(p.x, p.y);
            ctx.rotate(p.rot);
            ctx.fillStyle = p.color;
            if (p.shape === 'shard') {
              ctx.beginPath();
              ctx.moveTo(0, -s * 1.6);
              ctx.lineTo(s * 0.7, 0);
              ctx.lineTo(0, s * 1.6);
              ctx.lineTo(-s * 0.7, 0);
              ctx.fill();
            } else ctx.fillRect(-s, -s, s * 2, s * 2);
            ctx.restore();
            break;
          case 'star':
            ctx.fillStyle = p.color;
            star(ctx, p.x, p.y, s * 1.6, 4, 0.35);
            ctx.fill();
            break;
          case 'coin':
            ctx.fillStyle = '#ffd34a';
            ellipse(ctx, p.x, p.y, s * Math.abs(Math.cos(p.rot)) + 0.6, s);
            ctx.fill();
            ctx.strokeStyle = '#b8862a';
            ctx.lineWidth = 1;
            ctx.stroke();
            break;
          case 'leaf':
            ctx.save();
            ctx.translate(p.x, p.y);
            ctx.rotate(p.rot);
            ctx.fillStyle = p.color;
            ellipse(ctx, 0, 0, s * 1.4, s * 0.6);
            ctx.fill();
            ctx.restore();
            break;
          case 'snow':
            ctx.fillStyle = p.color;
            ctx.beginPath();
            ctx.arc(p.x, p.y, s, 0, Math.PI * 2);
            ctx.fill();
            break;
        }
      }
    }
    ctx.globalAlpha = 1;
    ctx.globalCompositeOperation = 'source-over';
  }
}

// =====================================================================
// 特效
// =====================================================================
export interface Fx {
  t: number;
  dur: number;
  update?(dt: number): void;
  draw(ctx: Ctx): void;
  /** 結束時呼叫（例如投射物命中爆炸） */
  done?(): void;
}

export function elColor(el: Element) {
  return ELEMENT_COLOR[el];
}

export class Projectile implements Fx {
  t = 0;
  constructor(
    public x0: number, public y0: number, public x1: number, public y1: number,
    public dur: number, public kind: 'arrow' | 'orb' | 'blade' | 'spit', public color: string, public size: number,
    private parts: Particles, public arc = 0, public onHit?: () => void,
    /** 美術貼圖（art/vfx/）與繪製寬度；有圖時取代程式繪製的外觀 */
    public sprite?: string, public spriteSize = 40, public spin = 0,
  ) {}
  pos(k: number) {
    const x = lerp(this.x0, this.x1, k);
    const y = lerp(this.y0, this.y1, k) - Math.sin(k * Math.PI) * this.arc;
    return [x, y] as const;
  }
  update(dt: number) {
    const [x, y] = this.pos(clamp01(this.t / this.dur));
    if (this.kind === 'orb' && Math.random() < 0.9 * this.parts.density) {
      this.parts.emit({ x, y, vx: (Math.random() - 0.5) * 40, vy: (Math.random() - 0.5) * 40, size: this.size * 0.5, color: this.color, max: 0.35, additive: true });
    }
    void dt;
  }
  draw(ctx: Ctx) {
    const k = clamp01(this.t / this.dur);
    const [x, y] = this.pos(k);
    const [px, py] = this.pos(Math.max(0, k - 0.06));
    const ang = Math.atan2(y - py, x - px);
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(ang);
    const img = this.sprite ? vfxImage(this.sprite) : null;
    if (img) {
      if (this.spin) ctx.rotate(this.t * this.spin);
      const w = this.spriteSize, h = (img.height / img.width) * w;
      // 貼圖的「前端」朝右，畫在略偏前方讓尾焰拖在後面
      ctx.drawImage(img, -w * 0.62, -h / 2, w, h);
      ctx.restore();
      return;
    }
    switch (this.kind) {
      case 'arrow':
        ctx.strokeStyle = alpha('#ffffff', 0.5);
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(-30, 0);
        ctx.lineTo(-6, 0);
        ctx.stroke();
        ctx.strokeStyle = '#6a4a2a';
        ctx.lineWidth = 2.4;
        ctx.beginPath();
        ctx.moveTo(-18, 0);
        ctx.lineTo(4, 0);
        ctx.stroke();
        ctx.fillStyle = '#e8eef8';
        ctx.beginPath();
        ctx.moveTo(4, -3.5);
        ctx.lineTo(11, 0);
        ctx.lineTo(4, 3.5);
        ctx.fill();
        ctx.fillStyle = this.color;
        ctx.fillRect(-20, -3, 5, 6);
        break;
      case 'orb':
        glow(ctx, 0, 0, this.size * 3, this.color, 0.7);
        ctx.fillStyle = '#ffffff';
        ellipse(ctx, 0, 0, this.size * 0.8, this.size * 0.65);
        ctx.fill();
        break;
      case 'blade':
        ctx.rotate(this.t * 30);
        ctx.fillStyle = '#d8dce8';
        ctx.beginPath();
        ctx.moveTo(-8, -2);
        ctx.lineTo(10, 0);
        ctx.lineTo(-8, 2);
        ctx.fill();
        glow(ctx, 0, 0, 10, this.color, 0.5);
        break;
      case 'spit':
        ctx.fillStyle = this.color;
        ellipse(ctx, 0, 0, this.size, this.size * 0.7);
        ctx.fill();
        break;
    }
    ctx.restore();
  }
  done() { this.onHit?.(); }
}

export class Slash implements Fx {
  t = 0;
  constructor(public x: number, public y: number, public r: number, public a0: number, public a1: number, public color: string, public dur = 0.28, public width = 10) {}
  draw(ctx: Ctx) {
    const k = clamp01(this.t / this.dur);
    const e = easeOut(k);
    const end = lerp(this.a0, this.a1, e);
    const start = lerp(this.a0, this.a1, Math.max(0, e - 0.55));
    ctx.save();
    ctx.globalAlpha = 1 - k;
    ctx.globalCompositeOperation = 'lighter';
    ctx.strokeStyle = this.color;
    ctx.lineCap = 'round';
    for (let i = 0; i < 3; i++) {
      ctx.lineWidth = this.width * (1 - i * 0.3);
      ctx.globalAlpha = (1 - k) * (0.35 + i * 0.3);
      ctx.beginPath();
      ctx.arc(this.x, this.y, this.r - i * 3, start, end, this.a1 < this.a0);
      ctx.stroke();
    }
    ctx.restore();
  }
}

export class Ring implements Fx {
  t = 0;
  constructor(public x: number, public y: number, public r0: number, public r1: number, public color: string, public dur = 0.45, public width = 6, public flat = 0.35) {}
  draw(ctx: Ctx) {
    const k = clamp01(this.t / this.dur);
    const r = lerp(this.r0, this.r1, easeOut(k));
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    ctx.globalAlpha = 1 - k;
    ctx.strokeStyle = this.color;
    ctx.lineWidth = this.width * (1 - k * 0.6);
    ellipse(ctx, this.x, this.y, r, r * this.flat);
    ctx.stroke();
    ctx.restore();
  }
}

export class Burst implements Fx {
  t = 0;
  constructor(public x: number, public y: number, public r: number, public color: string, public dur = 0.35) {}
  draw(ctx: Ctx) {
    const k = clamp01(this.t / this.dur);
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    ctx.globalAlpha = 1 - k;
    glow(ctx, this.x, this.y, this.r * (0.5 + easeOut(k)), this.color, 0.9);
    ctx.restore();
  }
}

export class Beam implements Fx {
  t = 0;
  constructor(public x0: number, public y0: number, public x1: number, public y1: number, public color: string, public dur = 0.3, public width = 10) {}
  draw(ctx: Ctx) {
    const k = clamp01(this.t / this.dur);
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    ctx.lineCap = 'round';
    for (const [w, a] of [[this.width * 2.2, 0.25], [this.width, 0.6], [this.width * 0.35, 1]] as const) {
      ctx.globalAlpha = a * (1 - k);
      ctx.strokeStyle = w < this.width ? '#ffffff' : this.color;
      ctx.lineWidth = w * (1 - k * 0.5);
      ctx.beginPath();
      ctx.moveTo(this.x0, this.y0);
      ctx.lineTo(this.x1, this.y1);
      ctx.stroke();
    }
    ctx.restore();
  }
}

export class Lightning implements Fx {
  t = 0;
  constructor(public pts: [number, number][], public color: string, public dur = 0.3) {}
  draw(ctx: Ctx) {
    const k = clamp01(this.t / this.dur);
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    ctx.lineJoin = 'round';
    for (const [w, c, a] of [[8, this.color, 0.35], [3, '#ffffff', 0.95]] as const) {
      ctx.globalAlpha = a * (1 - k);
      ctx.strokeStyle = c;
      ctx.lineWidth = w;
      ctx.beginPath();
      for (let i = 0; i < this.pts.length - 1; i++) {
        const [x0, y0] = this.pts[i];
        const [x1, y1] = this.pts[i + 1];
        if (i === 0) ctx.moveTo(x0, y0);
        const segs = 6;
        for (let s = 1; s <= segs; s++) {
          const q = s / segs;
          const jitter = s === segs ? 0 : (Math.random() - 0.5) * 22;
          ctx.lineTo(lerp(x0, x1, q) + jitter * 0.3, lerp(y0, y1, q) + jitter);
        }
      }
      ctx.stroke();
    }
    ctx.restore();
  }
}

export class Pillar implements Fx {
  t = 0;
  constructor(public x: number, public y: number, public w: number, public color: string, public dur = 0.6) {}
  draw(ctx: Ctx) {
    const k = clamp01(this.t / this.dur);
    const a = k < 0.2 ? k / 0.2 : 1 - (k - 0.2) / 0.8;
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    ctx.globalAlpha = a;
    const g = ctx.createLinearGradient(this.x - this.w, 0, this.x + this.w, 0);
    g.addColorStop(0, alpha(this.color, 0));
    g.addColorStop(0.5, alpha(this.color, 0.9));
    g.addColorStop(1, alpha(this.color, 0));
    ctx.fillStyle = g;
    ctx.fillRect(this.x - this.w, 0, this.w * 2, this.y);
    glow(ctx, this.x, this.y, this.w * 2, this.color, 0.7);
    ctx.restore();
  }
}

/** 從天而降的物體（隕石、聖錘、星辰、箭雨） */
export class Falling implements Fx {
  t = 0;
  constructor(
    public x: number, public y1: number, public dur: number, public kind: 'meteor' | 'hammer' | 'star' | 'arrow' | 'ice',
    public color: string, private parts: Particles, public onLand?: () => void, public size = 1,
    /** 美術貼圖、寬度與旋轉（預設朝下） */
    public sprite?: string, public spriteSize = 60, public spriteRot = 0,
  ) {}
  update() {
    const k = clamp01(this.t / this.dur);
    const [x, y] = this.pos(k);
    if ((this.kind === 'meteor' || this.kind === 'star') && Math.random() < this.parts.density) {
      this.parts.emit({ x, y, vx: (Math.random() - 0.5) * 30, vy: -40, size: 5 * this.size, color: this.color, max: 0.4, additive: true });
    }
  }
  pos(k: number) {
    const e = easeIn(k);
    return [this.x - 120 * (1 - e) * (this.kind === 'arrow' ? 0.3 : 1), lerp(-40, this.y1, e)] as const;
  }
  draw(ctx: Ctx) {
    const k = clamp01(this.t / this.dur);
    const [x, y] = this.pos(k);
    ctx.save();
    ctx.translate(x, y);
    const img = this.sprite ? vfxImage(this.sprite) : null;
    if (img) {
      ctx.rotate(this.spriteRot);
      const w = this.spriteSize, h = (img.height / img.width) * w;
      ctx.drawImage(img, -w / 2, -h / 2, w, h);
      ctx.restore();
      return;
    }
    ctx.scale(this.size, this.size);
    switch (this.kind) {
      case 'meteor':
        glow(ctx, 0, 0, 36, this.color, 0.8);
        ctx.fillStyle = '#4a2a1a';
        ellipse(ctx, 0, 0, 14, 12);
        ctx.fill();
        ctx.fillStyle = shade(this.color, 0.4);
        ellipse(ctx, 3, -3, 6, 5);
        ctx.fill();
        break;
      case 'hammer':
        ctx.rotate(Math.PI);
        glow(ctx, 0, 0, 40, this.color, 0.6);
        ctx.fillStyle = '#fff6c8';
        ctx.fillRect(-4, -30, 8, 34);
        ctx.fillRect(-18, 2, 36, 18);
        break;
      case 'star':
        glow(ctx, 0, 0, 30, this.color, 0.8);
        ctx.fillStyle = '#ffffff';
        star(ctx, 0, 0, 12, 5, 0.45);
        ctx.fill();
        break;
      case 'arrow':
        ctx.rotate(Math.PI / 2 - 0.25);
        ctx.strokeStyle = '#6a4a2a';
        ctx.lineWidth = 2.4;
        ctx.beginPath();
        ctx.moveTo(-18, 0);
        ctx.lineTo(4, 0);
        ctx.stroke();
        ctx.fillStyle = '#e8eef8';
        ctx.beginPath();
        ctx.moveTo(4, -3);
        ctx.lineTo(10, 0);
        ctx.lineTo(4, 3);
        ctx.fill();
        break;
      case 'ice':
        ctx.fillStyle = '#e0f6ff';
        ctx.beginPath();
        ctx.moveTo(0, 14);
        ctx.lineTo(5, -6);
        ctx.lineTo(0, -12);
        ctx.lineTo(-5, -6);
        ctx.fill();
        glow(ctx, 0, 0, 14, this.color, 0.5);
        break;
    }
    ctx.restore();
  }
  done() { this.onLand?.(); }
}

export class Vortex implements Fx {
  t = 0;
  constructor(public x: number, public y: number, public r: number, public color: string, public dur = 0.9) {}
  draw(ctx: Ctx) {
    const k = clamp01(this.t / this.dur);
    const a = Math.sin(k * Math.PI);
    ctx.save();
    ctx.translate(this.x, this.y);
    ctx.scale(1, 0.45);
    ctx.globalCompositeOperation = 'lighter';
    for (let i = 0; i < 4; i++) {
      ctx.globalAlpha = a * (0.6 - i * 0.12);
      ctx.strokeStyle = this.color;
      ctx.lineWidth = 6 - i;
      ctx.beginPath();
      ctx.arc(0, 0, this.r * (0.4 + i * 0.2), this.t * 6 + i, this.t * 6 + i + Math.PI * 1.3);
      ctx.stroke();
    }
    ctx.restore();
  }
}

export class Bubble implements Fx {
  t = 0;
  constructor(public x: number, public y: number, public r: number, public color: string, public dur = 0.6) {}
  draw(ctx: Ctx) {
    const k = clamp01(this.t / this.dur);
    ctx.save();
    ctx.globalAlpha = 1 - k;
    ctx.globalCompositeOperation = 'lighter';
    const r = this.r * (0.7 + easeOut(k) * 0.4);
    const g = ctx.createRadialGradient(this.x, this.y, r * 0.6, this.x, this.y, r);
    g.addColorStop(0, alpha(this.color, 0));
    g.addColorStop(1, alpha(this.color, 0.7));
    ctx.fillStyle = g;
    ellipse(ctx, this.x, this.y, r, r);
    ctx.fill();
    ctx.restore();
  }
}

/** 美術特效貼圖：位置固定，依時間縮放、旋轉、淡入淡出 */
export interface SpriteOpts {
  size: number;
  dur?: number;
  rot?: number;
  spin?: number;
  grow?: [number, number];
  /** 'out'：快速出現後淡出；'inout'：淡入淡出 */
  fade?: 'out' | 'inout';
  additive?: boolean;
  /** 垂直壓扁（地面上的魔法陣等） */
  squash?: number;
  vy?: number;
  flip?: boolean;
  alpha?: number;
  /** 錨點：center（預設）或 bottom（底部對齊 y） */
  anchor?: 'center' | 'bottom';
}

export class SpriteFx implements Fx {
  t = 0;
  dur: number;
  constructor(public name: string, public x: number, public y: number, public o: SpriteOpts) {
    this.dur = o.dur ?? 0.4;
  }
  draw(ctx: Ctx) {
    const img = vfxImage(this.name);
    if (!img) return;
    const k = clamp01(this.t / this.dur);
    const [g0, g1] = this.o.grow ?? [0.75, 1.1];
    const s = lerp(g0, g1, easeOut(k));
    const a = (this.o.fade === 'inout' ? Math.sin(k * Math.PI) : k < 0.12 ? k / 0.12 : 1 - (k - 0.12) / 0.88) * (this.o.alpha ?? 1);
    const w = this.o.size * s;
    const h = (img.height / img.width) * w * (this.o.squash ?? 1);
    ctx.save();
    ctx.globalAlpha = Math.max(0, Math.min(1, a));
    if (this.o.additive) ctx.globalCompositeOperation = 'lighter';
    ctx.translate(this.x, this.y + (this.o.vy ?? 0) * this.t);
    ctx.rotate((this.o.rot ?? 0) + (this.o.spin ?? 0) * this.t);
    if (this.o.flip) ctx.scale(-1, 1);
    ctx.drawImage(img, -w / 2, this.o.anchor === 'bottom' ? -h : -h / 2, w, h);
    ctx.restore();
  }
}

// =====================================================================
// 飄字
// =====================================================================
export interface FloatText {
  x: number; y: number; vy: number; vx: number;
  text: string; color: string; size: number;
  life: number; max: number; crit: boolean; stroke: string; icon?: string;
}

export class Texts {
  list: FloatText[] = [];
  cap = 70;
  add(t: Omit<FloatText, 'life' | 'vy' | 'vx' | 'stroke'> & Partial<Pick<FloatText, 'vy' | 'vx' | 'stroke'>>) {
    if (this.list.length >= this.cap) this.list.shift();
    this.list.push({ life: 0, vy: -60, vx: (Math.random() - 0.5) * 30, stroke: '#1b1420', ...t });
  }
  update(dt: number) {
    for (const t of this.list) {
      t.life += dt;
      t.y += t.vy * dt;
      t.x += t.vx * dt;
      t.vy *= Math.pow(0.9, dt * 60);
    }
    this.list = this.list.filter(t => t.life < t.max);
  }
  draw(ctx: Ctx) {
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    for (const t of this.list) {
      const k = t.life / t.max;
      const pop = t.crit ? (k < 0.12 ? 0.6 + (k / 0.12) * 0.9 : k < 0.25 ? 1.5 - ((k - 0.12) / 0.13) * 0.4 : 1.1) : k < 0.1 ? 0.7 + k * 3 : 1;
      const a = k > 0.7 ? 1 - (k - 0.7) / 0.3 : 1;
      ctx.globalAlpha = a;
      ctx.font = `900 ${Math.round(t.size * pop)}px "Noto Sans TC", "PingFang TC", system-ui, sans-serif`;
      ctx.lineWidth = Math.max(3, t.size * 0.22);
      ctx.strokeStyle = t.stroke;
      ctx.lineJoin = 'round';
      ctx.strokeText(t.text, t.x, t.y);
      ctx.fillStyle = t.color;
      ctx.fillText(t.text, t.x, t.y);
    }
    ctx.globalAlpha = 1;
  }
}

export { elColor as elementColor };
