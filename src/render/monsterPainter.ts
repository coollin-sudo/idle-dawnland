import type { Archetype } from '@/core/types';
import { alpha, clamp01, easeOut, ellipse, eye, fillStroke, glow, glowEye, OUTLINE, rrect, shade, shadow, star, vgrad, type Ctx } from './draw';

export interface MPose {
  t: number;
  attack: number;
  cast: number;
  seed: number;
}

type Pal = [string, string, string];
type Painter = (ctx: Ctx, p: Pal, f: Set<string>, pose: MPose) => void;

const lunge = (a: number, dist: number) => (a >= 0 ? Math.sin(clamp01(a) * Math.PI) * dist : 0);

// =====================================================================
// 史萊姆
// =====================================================================
const slime: Painter = (ctx, p, f, { t, attack }) => {
  shadow(ctx, 0, 0, 26);
  const sq = 1 + Math.sin(t * 3.2) * 0.06 + (attack >= 0 ? Math.sin(attack * Math.PI) * 0.18 : 0);
  ctx.save();
  ctx.translate(lunge(attack, 10), 0);
  ctx.scale(1 / Math.sqrt(sq) + 0.05, sq);
  ctx.beginPath();
  ctx.moveTo(-26, 0);
  ctx.bezierCurveTo(-30, -26, -14, -44, 2, -44);
  ctx.bezierCurveTo(20, -44, 32, -24, 26, 0);
  ctx.closePath();
  const g = ctx.createRadialGradient(-6, -30, 4, 0, -18, 36);
  g.addColorStop(0, shade(p[0], 0.45));
  g.addColorStop(0.6, p[0]);
  g.addColorStop(1, shade(p[1], -0.1));
  fillStroke(ctx, g, 2.6);
  ctx.fillStyle = 'rgba(255,255,255,0.6)';
  ellipse(ctx, -10, -32, 6, 4, -0.5);
  ctx.fill();
  ctx.restore();
  eye(ctx, 4 + lunge(attack, 10), -22, 4, p[2], 0.6, Math.sin(t * 0.7) > 0.97);
  eye(ctx, 16 + lunge(attack, 10), -22, 3.6, p[2], 0.6, Math.sin(t * 0.7) > 0.97);
  if (f.has('crown')) crown(ctx, 6, -44, 0.8);
};

// =====================================================================
// 四足獸
// =====================================================================
const beast: Painter = (ctx, p, f, { t, attack }) => {
  const small = f.has('small');
  shadow(ctx, 0, 0, small ? 20 : 30);
  const lg = lunge(attack, 14);
  const run = Math.sin(t * 6) * (attack >= 0 ? 4 : 1.2);
  ctx.save();
  ctx.translate(lg, Math.sin(t * 2.4) * 1.2);
  if (small) ctx.scale(0.8, 0.8);
  // 尾巴
  if (f.has('tail') || f.has('mane')) {
    ctx.beginPath();
    const sw = Math.sin(t * 4) * 6;
    ctx.moveTo(-26, -30);
    ctx.quadraticCurveTo(-44, -40 + sw, -46, -56 + sw);
    ctx.quadraticCurveTo(-36, -44, -22, -24);
    ctx.closePath();
    fillStroke(ctx, vgrad(ctx, -56, -24, p[0]), 2.2);
    if (f.has('flame')) glow(ctx, -44, -54 + sw, 14, '#ff8a3a', 0.6);
  }
  // 後腳
  for (const [x, ph] of [[-16, 0], [10, Math.PI]] as const) {
    rrect(ctx, x - 4 + Math.sin(t * 6 + ph) * run * 0.4, -16, 8, 16, 3);
    fillStroke(ctx, shade(p[0], -0.25), 2);
  }
  // 身體
  ellipse(ctx, -2, -26, 28, 15);
  fillStroke(ctx, vgrad(ctx, -41, -11, p[0]), 2.4);
  ctx.fillStyle = alpha(p[1], 0.9);
  ellipse(ctx, 2, -18, 16, 7);
  ctx.fill();
  // 鬃毛
  if (f.has('mane')) {
    ctx.beginPath();
    for (let i = 0; i <= 6; i++) {
      const a = -2.4 + i * 0.35;
      const r = i % 2 ? 16 : 24;
      ctx.lineTo(16 + Math.cos(a) * r, -34 + Math.sin(a) * r);
    }
    ctx.closePath();
    fillStroke(ctx, vgrad(ctx, -58, -20, f.has('flame') ? '#ff6a2a' : shade(p[0], 0.15)), 2);
  }
  // 前腳
  for (const [x, ph] of [[-12, Math.PI], [14, 0]] as const) {
    rrect(ctx, x - 4 + Math.sin(t * 6 + ph) * run * 0.4, -14, 8, 14, 3);
    fillStroke(ctx, p[0], 2);
  }
  // 頭
  const hx = 24, hy = -38;
  const jaw = attack >= 0 ? Math.sin(clamp01(attack) * Math.PI) * 0.5 : 0;
  if (f.has('ears')) {
    if (small && !f.has('tail')) {
      // 兔耳
      for (const dx of [-4, 4]) {
        ctx.beginPath();
        ellipse(ctx, hx + dx - 2, hy - 22, 4, 14, -0.2 + dx * 0.03);
        fillStroke(ctx, p[0], 2);
        ctx.fillStyle = '#f0a8b8';
        ellipse(ctx, hx + dx - 2, hy - 22, 1.8, 9, -0.2);
        ctx.fill();
      }
    } else {
      for (const dx of [-7, 5]) {
        ctx.beginPath();
        ctx.moveTo(hx + dx - 5, hy - 8);
        ctx.lineTo(hx + dx, hy - 22);
        ctx.lineTo(hx + dx + 6, hy - 8);
        ctx.closePath();
        fillStroke(ctx, p[0], 2);
      }
    }
  }
  ellipse(ctx, hx, hy, 14, 12);
  fillStroke(ctx, vgrad(ctx, hy - 12, hy + 12, p[0]), 2.4);
  // 嘴
  ctx.save();
  ctx.translate(hx + 10, hy + 4);
  ctx.rotate(jaw);
  ellipse(ctx, 4, 2, 8, 4);
  fillStroke(ctx, shade(p[1], -0.05), 2);
  ctx.restore();
  ellipse(ctx, hx + 12, hy + 1, 9, 6);
  fillStroke(ctx, p[1], 2);
  ctx.fillStyle = OUTLINE;
  ellipse(ctx, hx + 19, hy - 1, 2.6, 2);
  ctx.fill();
  if (f.has('tusks')) {
    ctx.beginPath();
    ctx.moveTo(hx + 14, hy + 5);
    ctx.quadraticCurveTo(hx + 22, hy + 4, hx + 22, hy - 6);
    ctx.quadraticCurveTo(hx + 18, hy + 1, hx + 12, hy + 2);
    fillStroke(ctx, '#f2e8d0', 1.6);
  }
  glowOrEye(ctx, hx + 4, hy - 3, 3, p[2]);
  if (f.has('horns')) horns(ctx, hx, hy - 8, 0.6);
  ctx.restore();
};

// =====================================================================
// 飛行（鳥、蝙蝠）
// =====================================================================
const bird: Painter = (ctx, p, f, { t, attack }) => {
  shadow(ctx, 0, 0, 18);
  const hover = Math.sin(t * 3) * 5 - 46;
  const flap = Math.sin(t * (f.has('batwings') ? 14 : 10));
  ctx.save();
  ctx.translate(lunge(attack, 18), hover);
  const wing = (front: boolean) => {
    ctx.save();
    ctx.translate(-2, -6);
    ctx.scale(1, front ? 1 : 0.85);
    ctx.rotate((front ? -0.2 : -0.5) + flap * 0.6);
    ctx.beginPath();
    if (f.has('batwings')) {
      ctx.moveTo(0, 0);
      ctx.lineTo(-10, -26);
      ctx.lineTo(-30, -18);
      ctx.quadraticCurveTo(-24, -10, -32, -2);
      ctx.quadraticCurveTo(-20, -4, -16, 4);
      ctx.quadraticCurveTo(-8, 0, 0, 6);
    } else {
      ctx.moveTo(0, 0);
      ctx.quadraticCurveTo(-14, -30, -38, -22);
      ctx.lineTo(-30, -14);
      ctx.lineTo(-36, -8);
      ctx.lineTo(-26, -4);
      ctx.lineTo(-30, 2);
      ctx.quadraticCurveTo(-12, 6, 0, 6);
    }
    ctx.closePath();
    fillStroke(ctx, vgrad(ctx, -30, 6, front ? p[1] : shade(p[1], -0.3)), 2.2);
    ctx.restore();
  };
  wing(false);
  // 尾巴
  ctx.beginPath();
  ctx.moveTo(-12, 0);
  ctx.lineTo(-28, 8);
  ctx.lineTo(-24, 0);
  ctx.lineTo(-30, -4);
  ctx.closePath();
  fillStroke(ctx, shade(p[0], -0.15), 2);
  ellipse(ctx, 0, 0, 17, 13);
  fillStroke(ctx, vgrad(ctx, -13, 13, p[0]), 2.4);
  ctx.fillStyle = alpha(p[1], 0.7);
  ellipse(ctx, 3, 4, 9, 6);
  ctx.fill();
  // 頭
  ellipse(ctx, 13, -10, 10, 9);
  fillStroke(ctx, p[0], 2.2);
  if (f.has('crest')) {
    ctx.beginPath();
    ctx.moveTo(8, -17);
    ctx.quadraticCurveTo(2, -32, 10, -26);
    ctx.quadraticCurveTo(12, -34, 16, -18);
    fillStroke(ctx, p[2], 1.8);
  }
  if (f.has('batwings')) {
    for (const dx of [7, 15]) {
      ctx.beginPath();
      ctx.moveTo(dx - 3, -16);
      ctx.lineTo(dx, -26);
      ctx.lineTo(dx + 3, -16);
      fillStroke(ctx, p[0], 1.8);
    }
    ctx.fillStyle = '#fff';
    ctx.beginPath();
    ctx.moveTo(18, -5);
    ctx.lineTo(19.5, -1);
    ctx.lineTo(21, -5);
    ctx.fill();
  } else {
    ctx.beginPath();
    ctx.moveTo(21, -12);
    ctx.lineTo(31, -8);
    ctx.lineTo(21, -5);
    ctx.closePath();
    fillStroke(ctx, '#f0b84a', 1.8);
  }
  glowOrEye(ctx, 16, -12, 2.6, p[2]);
  wing(true);
  ctx.restore();
};

// =====================================================================
// 蟲類（蜘蛛、蠍子、甲蟲）
// =====================================================================
const insect: Painter = (ctx, p, f, { t, attack }) => {
  const small = f.has('small');
  shadow(ctx, 0, 0, small ? 18 : 30);
  ctx.save();
  if (small) ctx.scale(0.7, 0.7);
  ctx.translate(lunge(attack, 10), 0);
  const legs = f.has('legs8') ? 4 : 3;
  ctx.strokeStyle = OUTLINE;
  for (let side = 0; side < 2; side++) {
    for (let i = 0; i < legs; i++) {
      const x = -14 + i * 11;
      const ph = Math.sin(t * 8 + i + side * 2) * 3;
      ctx.lineWidth = 4;
      ctx.strokeStyle = OUTLINE;
      ctx.beginPath();
      ctx.moveTo(x, -16);
      ctx.lineTo(x + (side ? 6 : -6) + ph, -28);
      ctx.lineTo(x + (side ? 12 : -10) + ph, 0);
      ctx.stroke();
      ctx.lineWidth = 2;
      ctx.strokeStyle = shade(p[0], side ? -0.1 : -0.35);
      ctx.stroke();
    }
  }
  if (f.has('stinger')) {
    // 蠍尾
    const sw = attack >= 0 ? Math.sin(attack * Math.PI) * 0.6 : Math.sin(t * 2) * 0.1;
    ctx.save();
    ctx.translate(-22, -18);
    for (let i = 0; i < 5; i++) {
      ctx.rotate(-0.55 - sw * 0.3);
      ellipse(ctx, 0, -6, 6 - i * 0.5, 7);
      fillStroke(ctx, vgrad(ctx, -13, 1, p[0]), 2);
      ctx.translate(0, -10);
    }
    ctx.beginPath();
    ctx.moveTo(-4, 0);
    ctx.quadraticCurveTo(10, -6, 12, 6);
    ctx.quadraticCurveTo(4, 0, 4, 2);
    fillStroke(ctx, p[2], 1.8);
    ctx.restore();
  }
  if (f.has('legs8')) {
    ellipse(ctx, -14, -22, 20, 16);
    fillStroke(ctx, vgrad(ctx, -38, -6, p[0]), 2.4);
    ctx.fillStyle = alpha(p[1], 0.9);
    ellipse(ctx, -16, -26, 8, 5);
    ctx.fill();
  } else {
    ellipse(ctx, -6, -18, 22, 12);
    fillStroke(ctx, vgrad(ctx, -30, -6, p[0]), 2.4);
    if (!f.has('stinger')) {
      ctx.strokeStyle = shade(p[0], -0.4);
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(-6, -30);
      ctx.lineTo(-6, -7);
      ctx.stroke();
      ctx.fillStyle = 'rgba(255,255,255,0.5)';
      ellipse(ctx, -14, -24, 6, 3, -0.4);
      ctx.fill();
    }
  }
  ellipse(ctx, 12, -20, 11, 10);
  fillStroke(ctx, vgrad(ctx, -30, -10, shade(p[0], 0.1)), 2.2);
  if (f.has('claws')) {
    for (const dy of [-2, 6]) {
      ctx.save();
      ctx.translate(20, -16 + dy);
      ctx.rotate(attack >= 0 ? -Math.sin(attack * Math.PI) * 0.5 : 0);
      ellipse(ctx, 10, 0, 9, 5);
      fillStroke(ctx, p[0], 2);
      ctx.beginPath();
      ctx.moveTo(16, -3);
      ctx.lineTo(24, -6);
      ctx.lineTo(18, 0);
      ctx.lineTo(24, 4);
      ctx.lineTo(16, 3);
      fillStroke(ctx, shade(p[0], 0.1), 1.6);
      ctx.restore();
    }
  }
  if (f.has('legs8')) {
    for (const [x, y] of [[16, -24], [20, -20], [13, -19], [18, -27]]) glowEye(ctx, x, y, 1.8, p[2]);
  } else glowOrEye(ctx, 17, -22, 2.8, p[2]);
  ctx.restore();
};

// =====================================================================
// 人形（哥布林、小惡魔、騎士…）
// =====================================================================
function humanoidBody(ctx: Ctx, p: Pal, f: Set<string>, t: number, attack: number, opts: { skin: string; cloth: string; eyeColor: string; skeletal?: boolean; bandage?: boolean; scale?: number }) {
  const s = opts.scale ?? 1;
  ctx.save();
  ctx.scale(s, s);
  shadow(ctx, 0, 0, 22);
  const bob = Math.sin(t * 2.6) * 1.2;
  ctx.translate(lunge(attack, 10), bob);
  if (f.has('batwings') || f.has('wings')) {
    for (const back of [true]) {
      ctx.save();
      ctx.translate(-6, -44);
      ctx.rotate(-0.4 + Math.sin(t * 5) * 0.2);
      ctx.beginPath();
      if (f.has('batwings')) {
        ctx.moveTo(0, 0);
        ctx.lineTo(-8, -22);
        ctx.lineTo(-26, -16);
        ctx.quadraticCurveTo(-20, -8, -26, 0);
        ctx.quadraticCurveTo(-14, -2, 0, 6);
      } else {
        ctx.moveTo(0, 0);
        ctx.quadraticCurveTo(-12, -28, -34, -22);
        ctx.lineTo(-26, -12);
        ctx.lineTo(-32, -6);
        ctx.quadraticCurveTo(-12, 0, 0, 6);
      }
      ctx.closePath();
      fillStroke(ctx, vgrad(ctx, -22, 6, f.has('wings') ? '#f0f4ff' : shade(opts.cloth, -0.2)), 2);
      ctx.restore();
      void back;
    }
  }
  if (f.has('cape')) {
    ctx.beginPath();
    ctx.moveTo(-8, -46);
    ctx.quadraticCurveTo(-22 - Math.sin(t * 3) * 3, -24, -20, -6);
    ctx.lineTo(4, -8);
    ctx.lineTo(6, -46);
    ctx.closePath();
    fillStroke(ctx, vgrad(ctx, -46, -6, p[1], 0, -0.4), 2);
  }
  if (f.has('sack')) {
    ellipse(ctx, -16, -32, 13, 15);
    fillStroke(ctx, vgrad(ctx, -47, -17, '#b8904a'), 2.2);
    ctx.fillStyle = '#ffe35c';
    ellipse(ctx, -14, -45, 5, 3);
    ctx.fill();
  }
  if (f.has('tail')) {
    ctx.strokeStyle = OUTLINE;
    ctx.lineWidth = 5;
    ctx.beginPath();
    ctx.moveTo(-6, -18);
    ctx.quadraticCurveTo(-24, -12, -22 + Math.sin(t * 3) * 3, -30);
    ctx.stroke();
    ctx.strokeStyle = opts.skin;
    ctx.lineWidth = 3;
    ctx.stroke();
  }
  // 腿
  for (const x of [-5, 5]) {
    rrect(ctx, x - 3.5, -18, 7, 16, 3);
    fillStroke(ctx, opts.skeletal ? opts.skin : shade(opts.cloth, -0.3), 2);
    rrect(ctx, x - 4.5, -5, 10, 5, 2);
    fillStroke(ctx, shade(opts.cloth, -0.55), 1.8);
  }
  // 身體
  if (opts.skeletal) {
    rrect(ctx, -9, -44, 18, 26, 6);
    fillStroke(ctx, alpha(opts.skin, 0.25), 2);
    ctx.strokeStyle = opts.skin;
    ctx.lineWidth = 3;
    for (let i = 0; i < 4; i++) {
      ctx.beginPath();
      ctx.moveTo(-8, -40 + i * 6);
      ctx.quadraticCurveTo(0, -36 + i * 6, 8, -40 + i * 6);
      ctx.stroke();
    }
    ctx.lineWidth = 3.4;
    ctx.beginPath();
    ctx.moveTo(0, -44);
    ctx.lineTo(0, -18);
    ctx.stroke();
  } else {
    rrect(ctx, -11, -44, 22, 27, 8);
    fillStroke(ctx, vgrad(ctx, -44, -17, opts.cloth), 2.4);
    if (opts.bandage) {
      ctx.strokeStyle = shade(opts.skin, -0.25);
      ctx.lineWidth = 1.6;
      for (let i = 0; i < 5; i++) {
        ctx.beginPath();
        ctx.moveTo(-11, -40 + i * 5);
        ctx.lineTo(11, -43 + i * 5 + 3);
        ctx.stroke();
      }
    }
  }
  // 頭
  const hy = -60;
  if (f.has('ears')) {
    for (const dx of [-1, 1]) {
      ctx.beginPath();
      ctx.moveTo(dx * 12 + 2, hy - 2);
      ctx.lineTo(dx * 30 + 2, hy - 10);
      ctx.lineTo(dx * 14 + 2, hy + 6);
      ctx.closePath();
      fillStroke(ctx, opts.skin, 2);
    }
  }
  ellipse(ctx, 2, hy, 17, 16);
  fillStroke(ctx, vgrad(ctx, hy - 16, hy + 16, opts.skin, 0.15, -0.15), 2.4);
  if (opts.skeletal) {
    ctx.fillStyle = OUTLINE;
    ellipse(ctx, 6, hy, 4.5, 5);
    ctx.fill();
    ellipse(ctx, 15, hy, 3.6, 4.5);
    ctx.fill();
    glowEye(ctx, 6, hy, 1.6, opts.eyeColor);
    glowEye(ctx, 15, hy, 1.4, opts.eyeColor);
    ctx.fillStyle = OUTLINE;
    for (let i = 0; i < 4; i++) ctx.fillRect(5 + i * 3, hy + 9, 1.6, 4);
  } else if (opts.bandage) {
    ctx.strokeStyle = shade(opts.skin, -0.25);
    ctx.lineWidth = 1.6;
    for (let i = 0; i < 4; i++) {
      ctx.beginPath();
      ctx.moveTo(-15, hy - 10 + i * 6);
      ctx.lineTo(19, hy - 13 + i * 6 + 4);
      ctx.stroke();
    }
    glowEye(ctx, 10, hy - 1, 2.4, opts.eyeColor);
  } else if (f.has('hood')) {
    ctx.beginPath();
    ctx.moveTo(-17, hy + 10);
    ctx.quadraticCurveTo(-20, hy - 22, 3, hy - 20);
    ctx.quadraticCurveTo(24, hy - 20, 20, hy + 4);
    ctx.quadraticCurveTo(12, hy - 6, 2, hy - 6);
    ctx.quadraticCurveTo(-8, hy - 4, -10, hy + 10);
    fillStroke(ctx, vgrad(ctx, hy - 22, hy + 10, opts.cloth), 2.2);
    ctx.fillStyle = 'rgba(0,0,0,0.6)';
    ellipse(ctx, 8, hy + 2, 9, 7);
    ctx.fill();
    glowEye(ctx, 6, hy + 1, 1.8, opts.eyeColor);
    glowEye(ctx, 13, hy + 1, 1.6, opts.eyeColor);
  } else {
    glowOrEye(ctx, 7, hy, 3.2, opts.eyeColor);
    glowOrEye(ctx, 15, hy, 2.8, opts.eyeColor);
    ctx.strokeStyle = '#3a1a1a';
    ctx.lineWidth = 1.8;
    ctx.beginPath();
    ctx.moveTo(6, hy + 8);
    ctx.lineTo(10, hy + 10);
    ctx.lineTo(15, hy + 7);
    ctx.stroke();
  }
  if (f.has('helmet')) {
    ctx.beginPath();
    ctx.moveTo(-17, hy + 2);
    ctx.quadraticCurveTo(-18, hy - 20, 2, hy - 20);
    ctx.quadraticCurveTo(22, hy - 20, 19, hy - 2);
    ctx.lineTo(-17, hy - 2);
    ctx.closePath();
    fillStroke(ctx, vgrad(ctx, hy - 20, hy, f.has('pickaxe') ? '#d8b04a' : '#8a8fa0', 0.3, -0.3), 2.2);
    if (f.has('pickaxe')) glow(ctx, 2, hy - 18, 8, '#fff2a8', 0.7);
  }
  if (f.has('pharaoh')) {
    ctx.beginPath();
    ctx.moveTo(-18, hy + 16);
    ctx.lineTo(-20, hy - 8);
    ctx.quadraticCurveTo(2, hy - 30, 22, hy - 8);
    ctx.lineTo(20, hy + 16);
    ctx.lineTo(14, hy + 4);
    ctx.lineTo(-10, hy + 4);
    ctx.closePath();
    const g = ctx.createLinearGradient(-20, 0, 22, 0);
    for (let i = 0; i <= 8; i++) g.addColorStop(i / 8, i % 2 ? '#2a4a9a' : '#f0c85a');
    fillStroke(ctx, g, 2.2);
    glowEye(ctx, 10, hy, 2.4, opts.eyeColor);
  }
  if (f.has('horns')) horns(ctx, 2, hy - 10, 0.5);
  if (f.has('crown')) crown(ctx, 2, hy - 14, 0.7);

  // 武器手
  ctx.save();
  ctx.translate(8, -40);
  const swing = attack >= 0 ? (attack < 0.35 ? -2 * (attack / 0.35) : -2 + 3.2 * clamp01((attack - 0.35) / 0.35)) : Math.sin(t * 2) * 0.05;
  ctx.rotate(0.9 + swing);
  rrect(ctx, -3, -3, 15, 7, 3);
  fillStroke(ctx, opts.skeletal ? opts.skin : opts.cloth, 2);
  ellipse(ctx, 14, 0, 4, 4);
  fillStroke(ctx, opts.skin, 1.8);
  ctx.translate(14, 0);
  ctx.rotate(-Math.PI / 2);
  if (f.has('dagger')) {
    ctx.beginPath();
    ctx.moveTo(-2, -4);
    ctx.lineTo(0, -22);
    ctx.lineTo(2, -4);
    fillStroke(ctx, '#d8dce8', 1.6);
  } else if (f.has('club')) {
    ctx.beginPath();
    ctx.moveTo(-3, 4);
    ctx.lineTo(-7, -30);
    ctx.quadraticCurveTo(0, -38, 7, -30);
    ctx.lineTo(3, 4);
    ctx.closePath();
    fillStroke(ctx, vgrad(ctx, -38, 4, '#8a5a2f'), 2);
  } else if (f.has('pickaxe')) {
    rrect(ctx, -2, -28, 4, 32, 2);
    fillStroke(ctx, '#7a5a3a', 1.6);
    ctx.beginPath();
    ctx.moveTo(-16, -24);
    ctx.quadraticCurveTo(0, -34, 16, -24);
    ctx.lineTo(0, -28);
    ctx.closePath();
    fillStroke(ctx, '#a8acb8', 1.8);
  } else if (f.has('spear')) {
    rrect(ctx, -1.6, -46, 3.2, 54, 1.5);
    fillStroke(ctx, '#a87a4a', 1.4);
    ctx.beginPath();
    ctx.moveTo(-4, -44);
    ctx.lineTo(0, -58);
    ctx.lineTo(4, -44);
    fillStroke(ctx, '#e8eef8', 1.6);
  } else if (f.has('sword')) {
    ctx.beginPath();
    ctx.moveTo(-3, -4);
    ctx.lineTo(-3, -36);
    ctx.lineTo(0, -42);
    ctx.lineTo(3, -36);
    ctx.lineTo(3, -4);
    fillStroke(ctx, '#6a6f80', 1.6);
    glow(ctx, 0, -24, 10, p[2], 0.25);
  } else if (f.has('staff')) {
    rrect(ctx, -2, -40, 4, 48, 2);
    fillStroke(ctx, '#f0c85a', 1.4);
    glowEye(ctx, 0, -42, 4, p[2]);
  }
  ctx.restore();
  ctx.restore();
}

const humanoid: Painter = (ctx, p, f, { t, attack }) => {
  humanoidBody(ctx, p, f, t, attack, { skin: p[0], cloth: p[1], eyeColor: p[2], scale: f.has('small') ? 0.85 : 1 });
};

const undead: Painter = (ctx, p, f, { t, attack }) => {
  const bandage = f.has('bandage');
  const skeletal = !bandage && !f.has('pharaoh') && !f.has('cape');
  humanoidBody(ctx, p, f, t, attack, {
    skin: bandage || f.has('pharaoh') ? p[0] : skeletal ? p[0] : '#5a5a6a',
    cloth: skeletal ? p[1] : bandage ? p[0] : p[1],
    eyeColor: p[2], skeletal, bandage,
  });
};

// =====================================================================
// 魔像
// =====================================================================
const golem: Painter = (ctx, p, f, { t, attack }) => {
  const small = f.has('small');
  ctx.save();
  if (small) ctx.scale(0.65, 0.65);
  shadow(ctx, 0, 0, 32);
  const slam = attack >= 0 ? Math.sin(clamp01(attack) * Math.PI) : 0;
  ctx.translate(lunge(attack, 6), Math.sin(t * 1.6) * 1);
  const body = f.has('gear') ? p[0] : p[0];
  // 腿
  for (const x of [-12, 10]) {
    rrect(ctx, x - 7, -22, 14, 22, 3);
    fillStroke(ctx, vgrad(ctx, -22, 0, shade(body, -0.15)), 2.2);
  }
  // 身體（不規則多邊形）
  ctx.beginPath();
  ctx.moveTo(-24, -24);
  ctx.lineTo(-28, -52);
  ctx.lineTo(-14, -66);
  ctx.lineTo(12, -68);
  ctx.lineTo(28, -54);
  ctx.lineTo(24, -24);
  ctx.closePath();
  fillStroke(ctx, vgrad(ctx, -68, -24, body), 2.6);
  // 核心 / 裂縫
  const pulse = 0.5 + Math.sin(t * 3) * 0.25;
  if (f.has('gear')) {
    ctx.save();
    ctx.translate(0, -46);
    ctx.rotate(t * 1.5);
    star(ctx, 0, 0, 10, 8, 0.7);
    fillStroke(ctx, shade(p[0], 0.3), 1.8);
    ctx.restore();
    glowEye(ctx, 0, -46, 3, p[2]);
  } else {
    ctx.strokeStyle = alpha(p[2], 0.6 + pulse * 0.4);
    ctx.lineWidth = 2.4;
    ctx.beginPath();
    ctx.moveTo(-14, -56);
    ctx.lineTo(-6, -46);
    ctx.lineTo(-12, -36);
    ctx.moveTo(6, -60);
    ctx.lineTo(10, -48);
    ctx.lineTo(4, -34);
    ctx.stroke();
    glow(ctx, 0, -46, 16, p[2], 0.25 + pulse * 0.2);
  }
  if (f.has('crystals')) {
    for (const [x, y, r] of [[-22, -58, -0.5], [-8, -70, -0.1], [18, -62, 0.4]] as const) {
      ctx.save();
      ctx.translate(x, y);
      ctx.rotate(r);
      ctx.beginPath();
      ctx.moveTo(-4, 4);
      ctx.lineTo(0, -12);
      ctx.lineTo(4, 4);
      ctx.closePath();
      fillStroke(ctx, vgrad(ctx, -12, 4, p[2], 0.5, -0.1), 1.6);
      ctx.restore();
    }
  }
  if (f.has('lava')) {
    for (let i = 0; i < 3; i++) glow(ctx, -14 + i * 14, -40 + (i % 2) * 10, 8, '#ff8a2a', 0.5 + Math.sin(t * 4 + i) * 0.2);
  }
  // 頭
  rrect(ctx, -2, -82, 20, 16, 4);
  fillStroke(ctx, vgrad(ctx, -82, -66, shade(body, 0.1)), 2.2);
  glowEye(ctx, 6, -75, 2, p[2]);
  glowEye(ctx, 13, -75, 2, p[2]);
  // 手臂
  for (const [x, front] of [[-24, false], [22, true]] as const) {
    ctx.save();
    ctx.translate(x, -58);
    ctx.rotate((front ? -0.2 : 0.2) - slam * 1.4);
    rrect(ctx, -7, 0, 14, 30, 5);
    fillStroke(ctx, vgrad(ctx, 0, 30, front ? body : shade(body, -0.2)), 2.2);
    ellipse(ctx, 0, 33, 10, 9);
    fillStroke(ctx, shade(body, -0.1), 2.2);
    ctx.restore();
  }
  if (f.has('spear')) {
    // 長矛直立握在身前
    const sx = 30 + slam * 10;
    rrect(ctx, sx - 2, -112 + slam * 20, 4, 100, 2);
    fillStroke(ctx, vgrad(ctx, -112, -12, '#d8b04a', 0.3, -0.2), 1.6);
    ctx.beginPath();
    ctx.moveTo(sx - 6, -110 + slam * 20);
    ctx.lineTo(sx, -128 + slam * 20);
    ctx.lineTo(sx + 6, -110 + slam * 20);
    ctx.closePath();
    fillStroke(ctx, '#e8eef8', 1.6);
  }
  ctx.restore();
};

// =====================================================================
// 植物（蘑菇、樹人）
// =====================================================================
const plant: Painter = (ctx, p, f, { t, attack }) => {
  if (f.has('treant')) {
    shadow(ctx, 0, 0, 34);
    ctx.save();
    ctx.translate(lunge(attack, 6), 0);
    const sway = Math.sin(t * 1.4) * 0.04;
    ctx.rotate(sway);
    // 根
    ctx.fillStyle = shade(p[0], -0.2);
    for (const x of [-22, -6, 12]) {
      ctx.beginPath();
      ctx.moveTo(x, -10);
      ctx.quadraticCurveTo(x - 8, -2, x - 12, 0);
      ctx.lineTo(x + 8, 0);
      ctx.closePath();
      fillStroke(ctx, shade(p[0], -0.2), 2);
    }
    // 樹幹
    ctx.beginPath();
    ctx.moveTo(-22, -4);
    ctx.quadraticCurveTo(-28, -50, -18, -80);
    ctx.lineTo(18, -80);
    ctx.quadraticCurveTo(26, -50, 20, -4);
    ctx.closePath();
    fillStroke(ctx, vgrad(ctx, -80, -4, p[0]), 2.6);
    ctx.strokeStyle = shade(p[0], -0.4);
    ctx.lineWidth = 2;
    for (const x of [-10, 2, 12]) {
      ctx.beginPath();
      ctx.moveTo(x, -70);
      ctx.quadraticCurveTo(x - 4, -40, x + 2, -12);
      ctx.stroke();
    }
    // 臉
    ctx.fillStyle = 'rgba(0,0,0,0.65)';
    ellipse(ctx, 2, -56, 5, 6);
    ctx.fill();
    ellipse(ctx, 14, -56, 4.4, 5.4);
    ctx.fill();
    glowEye(ctx, 2, -56, 2, p[2]);
    glowEye(ctx, 14, -56, 1.8, p[2]);
    ctx.fillStyle = 'rgba(0,0,0,0.7)';
    ellipse(ctx, 8, -40, 7, attack >= 0 ? 6 : 3);
    ctx.fill();
    // 手臂樹枝
    for (const [x, d] of [[-18, -1], [18, 1]] as const) {
      ctx.save();
      ctx.translate(x, -64);
      ctx.rotate(d * (0.9 + Math.sin(t * 2 + d) * 0.1) - (attack >= 0 && d > 0 ? Math.sin(attack * Math.PI) * 1.2 : 0));
      ctx.strokeStyle = OUTLINE;
      ctx.lineWidth = 9;
      ctx.beginPath();
      ctx.moveTo(0, 0);
      ctx.lineTo(d * 26, -6);
      ctx.lineTo(d * 36, -18);
      ctx.stroke();
      ctx.strokeStyle = p[0];
      ctx.lineWidth = 6;
      ctx.stroke();
      ctx.restore();
    }
    // 樹冠
    for (const [x, y, r] of [[-20, -88, 20], [6, -98, 24], [24, -84, 18], [-4, -80, 18]] as const) {
      ellipse(ctx, x, y, r, r * 0.85);
      fillStroke(ctx, vgrad(ctx, y - r, y + r, p[1], 0.2, -0.25), 2.2);
    }
    ctx.restore();
    return;
  }
  // 蘑菇
  shadow(ctx, 0, 0, 22);
  ctx.save();
  const hop = attack >= 0 ? -Math.sin(attack * Math.PI) * 10 : Math.abs(Math.sin(t * 2.4)) * -3;
  ctx.translate(lunge(attack, 8), hop);
  rrect(ctx, -12, -30, 24, 30, 10);
  fillStroke(ctx, vgrad(ctx, -30, 0, p[1]), 2.4);
  eye(ctx, 2, -16, 3, '#2a1a1a', 0.5, Math.sin(t * 0.9) > 0.97);
  eye(ctx, 10, -16, 2.8, '#2a1a1a', 0.5, Math.sin(t * 0.9) > 0.97);
  ctx.beginPath();
  ctx.moveTo(-30, -26);
  ctx.quadraticCurveTo(-28, -62, 2, -62);
  ctx.quadraticCurveTo(32, -62, 32, -26);
  ctx.quadraticCurveTo(2, -20, -30, -26);
  fillStroke(ctx, vgrad(ctx, -62, -24, p[0], 0.2, -0.2), 2.6);
  ctx.fillStyle = p[2];
  for (const [x, y, r] of [[-14, -44, 5], [4, -52, 6], [18, -40, 4.5], [-2, -34, 3.5]] as const) {
    ellipse(ctx, x, y, r, r * 0.8);
    ctx.fill();
  }
  ctx.restore();
};

// =====================================================================
// 蛇類與觸手
// =====================================================================
const serpent: Painter = (ctx, p, f, { t, attack }) => {
  shadow(ctx, 0, 0, 30);
  if (f.has('tentacle')) {
    for (let i = 0; i < 3; i++) {
      const x = -20 + i * 18;
      const h = 50 + i * 12;
      const sw = Math.sin(t * 2 + i) * 10 + (attack >= 0 ? Math.sin(attack * Math.PI) * 14 : 0);
      ctx.beginPath();
      ctx.moveTo(x - 8, 0);
      ctx.bezierCurveTo(x - 10, -h * 0.4, x + sw - 6, -h * 0.7, x + sw, -h);
      ctx.bezierCurveTo(x + sw + 6, -h * 0.7, x + 10, -h * 0.4, x + 8, 0);
      ctx.closePath();
      fillStroke(ctx, vgrad(ctx, -h, 0, p[0 + (i % 2)]), 2.4);
      ctx.fillStyle = alpha(p[2], 0.8);
      for (let k = 1; k < 4; k++) {
        ellipse(ctx, x + sw * (k / 4) + 3, -h * (k / 4.5), 2, 2);
        ctx.fill();
      }
    }
    ellipse(ctx, 0, 0, 30, 6);
    ctx.fillStyle = '#0a0612';
    ctx.fill();
    return;
  }
  ctx.save();
  ctx.translate(lunge(attack, 14), 0);
  // 身體：一連串圓
  const segs = 9;
  const pts: [number, number, number][] = [];
  for (let i = 0; i < segs; i++) {
    const k = i / (segs - 1);
    const x = -34 + k * 50;
    const y = -8 - Math.max(0, k - 0.45) * 70 + Math.sin(t * 3 + i * 0.8) * 3 * (1 - k);
    pts.push([x, y, 10 - k * 2 + (k > 0.8 ? 2 : 0)]);
  }
  if (f.has('legs')) {
    for (const [x] of [pts[2], pts[4]]) {
      for (const d of [-1, 1]) {
        ctx.strokeStyle = OUTLINE;
        ctx.lineWidth = 4;
        ctx.beginPath();
        ctx.moveTo(x, -8);
        ctx.lineTo(x + d * 6 + Math.sin(t * 6) * 2, 0);
        ctx.stroke();
      }
    }
  }
  for (const [x, y, r] of pts) {
    ellipse(ctx, x, y, r, r * 0.9);
    fillStroke(ctx, vgrad(ctx, y - r, y + r, p[0]), 2);
  }
  for (const [x, y, r] of pts) {
    ctx.fillStyle = p[0];
    ellipse(ctx, x, y, r - 1.6, r * 0.9 - 1.6);
    ctx.fill();
    ctx.fillStyle = alpha(p[1], 0.8);
    ellipse(ctx, x, y + r * 0.35, r * 0.6, r * 0.35);
    ctx.fill();
  }
  if (f.has('flame')) for (let i = 1; i < 6; i += 2) glow(ctx, pts[i][0], pts[i][1] - 10, 9, '#ffb04a', 0.6 + Math.sin(t * 6 + i) * 0.2);
  // 頭
  const [hx, hy] = pts[segs - 1];
  ellipse(ctx, hx + 6, hy, 14, 10);
  fillStroke(ctx, vgrad(ctx, hy - 10, hy + 10, p[0]), 2.4);
  glowOrEye(ctx, hx + 8, hy - 3, 3, p[2] === '#3a2a1a' ? '#ffd34a' : p[2]);
  if (attack >= 0) {
    ctx.fillStyle = '#fff';
    ctx.beginPath();
    ctx.moveTo(hx + 14, hy + 4);
    ctx.lineTo(hx + 16, hy + 10);
    ctx.lineTo(hx + 18, hy + 4);
    ctx.fill();
  }
  ctx.strokeStyle = '#e04a6a';
  ctx.lineWidth = 1.6;
  ctx.beginPath();
  ctx.moveTo(hx + 19, hy + 2);
  ctx.lineTo(hx + 26, hy + 2 + Math.sin(t * 10) * 2);
  ctx.stroke();
  ctx.restore();
};

// =====================================================================
// 元素
// =====================================================================
const elemental: Painter = (ctx, p, f, { t, attack, cast }) => {
  shadow(ctx, 0, 0, 22);
  const y = -52 + Math.sin(t * 2.4) * 5;
  ctx.save();
  ctx.translate(lunge(attack, 10), 0);
  const power = Math.max(cast, attack >= 0 ? Math.sin(attack * Math.PI) : 0);
  glow(ctx, 0, y, 46 + power * 16, p[0], 0.35 + power * 0.25);
  if (f.has('storm')) {
    // 雲狀身軀
    for (const [x, yy, r] of [[-18, 6, 16], [0, -4, 22], [18, 4, 16], [0, 14, 18]] as const) {
      ellipse(ctx, x, y + yy, r, r * 0.8);
      fillStroke(ctx, vgrad(ctx, y + yy - r, y + yy + r, p[0], 0.25, -0.3), 2.2);
    }
    ctx.strokeStyle = p[1];
    ctx.lineWidth = 2.4;
    for (let i = 0; i < 2; i++) {
      if (Math.sin(t * 7 + i * 3) < 0.3) continue;
      ctx.beginPath();
      let lx = -10 + i * 20, ly = y + 20;
      ctx.moveTo(lx, ly);
      for (let k = 0; k < 4; k++) { lx += (Math.sin(t * 13 + k + i) * 8); ly += 10; ctx.lineTo(lx, ly); }
      ctx.stroke();
    }
    glowEye(ctx, -4, y - 2, 3, p[1]);
    glowEye(ctx, 10, y - 2, 3, p[1]);
    if (f.has('crown')) crown(ctx, 2, y - 22, 0.9);
  } else if (f.has('flame')) {
    const flick = (k: number) => Math.sin(t * 9 + k) * 3;
    ctx.beginPath();
    ctx.moveTo(-18, y + 18);
    ctx.quadraticCurveTo(-26, y - 6 + flick(1), -10, y - 18);
    ctx.quadraticCurveTo(-8, y - 36 + flick(2), 2, y - 44 + flick(3));
    ctx.quadraticCurveTo(6, y - 28, 14, y - 30 + flick(4));
    ctx.quadraticCurveTo(26, y - 8, 18, y + 18);
    ctx.quadraticCurveTo(0, y + 26, -18, y + 18);
    const g = ctx.createRadialGradient(0, y + 6, 2, 0, y, 40);
    g.addColorStop(0, p[2]);
    g.addColorStop(0.4, p[1]);
    g.addColorStop(1, p[0]);
    fillStroke(ctx, g, 2.2);
    eye(ctx, -2, y + 2, 3.4, '#4a1a0a', 0.5);
    eye(ctx, 8, y + 2, 3, '#4a1a0a', 0.5);
  } else {
    // 冰晶核心 + 環繞碎片
    ctx.save();
    ctx.translate(0, y);
    ctx.rotate(Math.sin(t) * 0.2);
    ctx.beginPath();
    ctx.moveTo(0, -24);
    ctx.lineTo(16, -4);
    ctx.lineTo(8, 22);
    ctx.lineTo(-8, 22);
    ctx.lineTo(-16, -4);
    ctx.closePath();
    fillStroke(ctx, vgrad(ctx, -24, 22, p[0], 0.5, -0.2), 2.4);
    ctx.strokeStyle = alpha('#ffffff', 0.6);
    ctx.lineWidth = 1.6;
    ctx.beginPath();
    ctx.moveTo(0, -24);
    ctx.lineTo(0, 22);
    ctx.moveTo(-16, -4);
    ctx.lineTo(16, -4);
    ctx.stroke();
    ctx.restore();
    glowEye(ctx, -3, y - 2, 2.4, '#ffffff');
    glowEye(ctx, 6, y - 2, 2.2, '#ffffff');
    if (f.has('shards')) {
      for (let i = 0; i < 4; i++) {
        const a = t * 1.6 + (i / 4) * Math.PI * 2;
        const sx = Math.cos(a) * 30, sy = y + Math.sin(a) * 10;
        ctx.save();
        ctx.translate(sx, sy);
        ctx.rotate(a);
        ctx.beginPath();
        ctx.moveTo(0, -7);
        ctx.lineTo(4, 0);
        ctx.lineTo(0, 7);
        ctx.lineTo(-4, 0);
        ctx.closePath();
        fillStroke(ctx, p[1], 1.4);
        ctx.restore();
      }
    }
  }
  ctx.restore();
};

// =====================================================================
// 眼球
// =====================================================================
const eyeball: Painter = (ctx, p, _f, { t, attack, cast }) => {
  shadow(ctx, 0, 0, 20);
  const y = -56 + Math.sin(t * 2) * 6;
  ctx.save();
  ctx.translate(lunge(attack, 8), 0);
  // 觸手
  for (let i = 0; i < 4; i++) {
    const x = -12 + i * 8;
    ctx.strokeStyle = OUTLINE;
    ctx.lineWidth = 5;
    ctx.beginPath();
    ctx.moveTo(x, y + 14);
    ctx.quadraticCurveTo(x + Math.sin(t * 3 + i) * 8, y + 30, x + Math.sin(t * 2 + i) * 6, y + 42);
    ctx.stroke();
    ctx.strokeStyle = p[0];
    ctx.lineWidth = 3;
    ctx.stroke();
  }
  glow(ctx, 0, y, 40, p[1], 0.3 + cast * 0.3);
  ellipse(ctx, 0, y, 24, 22);
  fillStroke(ctx, vgrad(ctx, y - 22, y + 22, p[0], 0.15, -0.3), 2.6);
  ellipse(ctx, 2, y, 17, 16);
  fillStroke(ctx, '#f4eef8', 1.8);
  ctx.strokeStyle = alpha('#e04a6a', 0.6);
  ctx.lineWidth = 1;
  for (let i = 0; i < 5; i++) {
    const a = i * 1.3;
    ctx.beginPath();
    ctx.moveTo(2 + Math.cos(a) * 16, y + Math.sin(a) * 15);
    ctx.lineTo(2 + Math.cos(a + 0.2) * 9, y + Math.sin(a + 0.3) * 8);
    ctx.stroke();
  }
  const look = Math.sin(t * 0.8) * 3 + 4;
  const g = ctx.createRadialGradient(2 + look, y, 1, 2 + look, y, 9);
  g.addColorStop(0, shade(p[2], 0.3));
  g.addColorStop(1, p[1]);
  ellipse(ctx, 2 + look, y, 9, 9);
  fillStroke(ctx, g, 1.6);
  ctx.fillStyle = '#0a0612';
  ellipse(ctx, 2 + look, y, 3, 6);
  ctx.fill();
  ctx.fillStyle = '#fff';
  ellipse(ctx, look - 1, y - 4, 2, 2);
  ctx.fill();
  ctx.restore();
};

// =====================================================================
// 龍
// =====================================================================
const dragon: Painter = (ctx, p, f, { t, attack, cast }) => {
  const small = f.has('small');
  ctx.save();
  if (small) ctx.scale(0.5, 0.5);
  shadow(ctx, 0, 0, 46);
  const flap = Math.sin(t * 3.2);
  const breath = Math.max(cast, attack >= 0 ? Math.sin(attack * Math.PI) : 0);
  ctx.translate(lunge(attack, 8), Math.sin(t * 1.6) * 2);
  // 後翼
  const wing = (front: boolean) => {
    if (!f.has('wings')) return;
    ctx.save();
    ctx.translate(-8, -58);
    ctx.rotate((front ? -0.35 : -0.6) + flap * 0.25);
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.lineTo(-14, -46);
    ctx.lineTo(-58, -52);
    ctx.quadraticCurveTo(-50, -36, -62, -26);
    ctx.quadraticCurveTo(-44, -22, -48, -8);
    ctx.quadraticCurveTo(-28, -10, -24, 4);
    ctx.quadraticCurveTo(-12, -2, 0, 10);
    ctx.closePath();
    fillStroke(ctx, vgrad(ctx, -52, 10, front ? p[1] : shade(p[1], -0.3), 0.1, -0.3), 2.4);
    ctx.strokeStyle = alpha(OUTLINE, 0.6);
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(-14, -46);
    ctx.lineTo(-30, -8);
    ctx.moveTo(-14, -46);
    ctx.lineTo(-50, -20);
    ctx.stroke();
    ctx.restore();
  };
  wing(false);
  // 尾巴
  ctx.beginPath();
  ctx.moveTo(-30, -30);
  ctx.quadraticCurveTo(-62, -20 + Math.sin(t * 2) * 6, -74, -40 + Math.sin(t * 2) * 8);
  ctx.quadraticCurveTo(-58, -14, -26, -16);
  ctx.closePath();
  fillStroke(ctx, vgrad(ctx, -44, -14, p[0]), 2.4);
  // 腿
  for (const x of [-20, 14]) {
    rrect(ctx, x - 7, -24, 14, 24, 5);
    fillStroke(ctx, vgrad(ctx, -24, 0, shade(p[0], -0.2)), 2.2);
  }
  // 身體
  ellipse(ctx, -4, -36, 34, 22);
  fillStroke(ctx, vgrad(ctx, -58, -14, p[0]), 2.6);
  ctx.fillStyle = alpha(p[1], 0.9);
  ellipse(ctx, 4, -26, 22, 10);
  ctx.fill();
  // 脖子與頭
  const neckLift = breath * 6;
  ctx.beginPath();
  ctx.moveTo(14, -50);
  ctx.quadraticCurveTo(30, -76 - neckLift, 34, -84 - neckLift);
  ctx.lineTo(46, -78 - neckLift);
  ctx.quadraticCurveTo(36, -60, 26, -34);
  ctx.closePath();
  fillStroke(ctx, vgrad(ctx, -84, -34, p[0]), 2.4);
  const hx = 44, hy = -86 - neckLift;
  if (f.has('horns')) horns(ctx, hx - 4, hy - 8, 0.8);
  ellipse(ctx, hx, hy, 15, 12);
  fillStroke(ctx, vgrad(ctx, hy - 12, hy + 12, p[0]), 2.4);
  ctx.save();
  ctx.translate(hx + 8, hy + 4);
  ctx.rotate(breath * 0.4);
  rrect(ctx, 0, -2, 18, 7, 3);
  fillStroke(ctx, shade(p[0], -0.1), 2);
  ctx.restore();
  rrect(ctx, hx + 6, hy - 6, 20, 9, 4);
  fillStroke(ctx, p[0], 2.2);
  glowEye(ctx, hx + 2, hy - 4, 3, p[2]);
  if (f.has('crown')) crown(ctx, hx - 2, hy - 12, 0.8);
  if (breath > 0.2) glow(ctx, hx + 26, hy + 4, 20 * breath, p[2], 0.5 * breath);
  wing(true);
  ctx.restore();
};

// =====================================================================
// 巨人
// =====================================================================
const giant: Painter = (ctx, p, f, { t, attack }) => {
  shadow(ctx, 0, 0, 34);
  ctx.save();
  const slam = attack >= 0 ? Math.sin(clamp01(attack) * Math.PI) : 0;
  ctx.translate(lunge(attack, 8), Math.sin(t * 1.8) * 1.5);
  if (f.has('batwings')) {
    ctx.save();
    ctx.translate(-10, -76);
    ctx.rotate(-0.5 + Math.sin(t * 2) * 0.15);
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.lineTo(-16, -40);
    ctx.lineTo(-56, -36);
    ctx.quadraticCurveTo(-44, -20, -56, -8);
    ctx.quadraticCurveTo(-30, -10, 0, 12);
    fillStroke(ctx, vgrad(ctx, -40, 12, shade(p[0], 0.1), 0, -0.4), 2.4);
    ctx.restore();
  }
  for (const x of [-12, 12]) {
    rrect(ctx, x - 8, -30, 16, 30, 6);
    fillStroke(ctx, vgrad(ctx, -30, 0, shade(p[f.has('fur') ? 0 : 1], -0.1)), 2.4);
  }
  ellipse(ctx, 0, -58, 30, 32);
  fillStroke(ctx, vgrad(ctx, -90, -26, p[0]), 2.8);
  if (f.has('fur')) {
    ctx.strokeStyle = shade(p[0], -0.15);
    ctx.lineWidth = 2;
    for (let i = 0; i < 8; i++) {
      ctx.beginPath();
      ctx.moveTo(-20 + i * 5, -70 + (i % 3) * 8);
      ctx.lineTo(-22 + i * 5, -62 + (i % 3) * 8);
      ctx.stroke();
    }
  } else {
    ctx.fillStyle = alpha(p[1], 0.85);
    ellipse(ctx, 2, -42, 22, 12);
    ctx.fill();
  }
  if (f.has('flame')) for (let i = 0; i < 3; i++) glow(ctx, -14 + i * 14, -64, 12, '#ff8a2a', 0.5 + Math.sin(t * 5 + i) * 0.2);
  // 頭
  const hy = -92;
  ellipse(ctx, 6, hy, 17, 15);
  fillStroke(ctx, vgrad(ctx, hy - 15, hy + 15, f.has('fur') ? p[0] : shade(p[0], 0.08)), 2.6);
  if (f.has('fur')) {
    ctx.fillStyle = p[1];
    ellipse(ctx, 12, hy + 2, 10, 9);
    ctx.fill();
  }
  glowOrEye(ctx, 10, hy - 2, 3, p[2]);
  glowOrEye(ctx, 19, hy - 2, 2.6, p[2]);
  if (f.has('tusks')) {
    for (const dx of [8, 18]) {
      ctx.beginPath();
      ctx.moveTo(dx, hy + 8);
      ctx.lineTo(dx + 2, hy - 2);
      ctx.lineTo(dx + 4, hy + 8);
      fillStroke(ctx, '#f2e8d0', 1.4);
    }
  }
  if (f.has('horns')) horns(ctx, 6, hy - 10, 0.8);
  // 手臂與武器
  ctx.save();
  ctx.translate(22, -70);
  ctx.rotate(0.3 - slam * 2);
  rrect(ctx, -8, 0, 16, 40, 7);
  fillStroke(ctx, vgrad(ctx, 0, 40, p[0]), 2.4);
  ellipse(ctx, 0, 44, 10, 10);
  fillStroke(ctx, shade(p[0], -0.1), 2.2);
  if (f.has('club')) {
    ctx.translate(0, 44);
    ctx.rotate(Math.PI);
    ctx.beginPath();
    ctx.moveTo(-4, -4);
    ctx.lineTo(-10, 46);
    ctx.quadraticCurveTo(0, 56, 10, 46);
    ctx.lineTo(4, -4);
    fillStroke(ctx, vgrad(ctx, -4, 56, '#8a5a2f'), 2.4);
  }
  ctx.restore();
  ctx.restore();
};

// =====================================================================
// 精靈 / 幽魂
// =====================================================================
const spirit: Painter = (ctx, p, _f, { t, attack, cast }) => {
  shadow(ctx, 0, 0, 16);
  const y = -50 + Math.sin(t * 2.2) * 6;
  ctx.save();
  ctx.translate(lunge(attack, 12), 0);
  glow(ctx, 0, y, 38, p[0], 0.4 + cast * 0.3);
  ctx.globalAlpha = 0.9;
  ctx.beginPath();
  ctx.moveTo(-18, y);
  ctx.bezierCurveTo(-18, y - 26, 18, y - 26, 18, y);
  ctx.bezierCurveTo(18, y + 14, 6, y + 16, 2 + Math.sin(t * 4) * 6, y + 34);
  ctx.bezierCurveTo(-4, y + 18, -18, y + 14, -18, y);
  const g = ctx.createRadialGradient(-4, y - 8, 2, 0, y, 30);
  g.addColorStop(0, '#ffffff');
  g.addColorStop(0.5, p[0]);
  g.addColorStop(1, alpha(p[1], 0.7));
  fillStroke(ctx, g, 2);
  ctx.globalAlpha = 1;
  eye(ctx, 0, y - 4, 3.2, '#1a2a2a', 0.5, Math.sin(t * 0.8) > 0.97);
  eye(ctx, 9, y - 4, 2.8, '#1a2a2a', 0.5, Math.sin(t * 0.8) > 0.97);
  for (let i = 0; i < 3; i++) {
    const a = t * 2 + i * 2.1;
    glow(ctx, Math.cos(a) * 24, y + Math.sin(a) * 14, 5, p[2], 0.8);
  }
  ctx.restore();
};

// ---------------------------------------------------------------------
function glowOrEye(ctx: Ctx, x: number, y: number, r: number, color: string) {
  const [rr, gg, bb] = [parseInt(color.slice(1, 3), 16), parseInt(color.slice(3, 5), 16), parseInt(color.slice(5, 7), 16)];
  const bright = (rr + gg + bb) / 3 > 140;
  if (bright) glowEye(ctx, x, y, r * 0.8, color);
  else eye(ctx, x, y, r, color === '#000000' ? OUTLINE : '#1b1420', 0.5);
}

function horns(ctx: Ctx, x: number, y: number, s: number) {
  for (const d of [-1, 1]) {
    ctx.beginPath();
    ctx.moveTo(x + d * 8 * s, y);
    ctx.quadraticCurveTo(x + d * 22 * s, y - 6 * s, x + d * 20 * s, y - 26 * s);
    ctx.quadraticCurveTo(x + d * 14 * s, y - 10 * s, x + d * 2 * s, y - 4 * s);
    ctx.closePath();
    fillStroke(ctx, vgrad(ctx, y - 26 * s, y, '#f0e6d0'), 2);
  }
}

function crown(ctx: Ctx, x: number, y: number, s: number) {
  ctx.beginPath();
  ctx.moveTo(x - 14 * s, y);
  ctx.lineTo(x - 16 * s, y - 16 * s);
  ctx.lineTo(x - 7 * s, y - 8 * s);
  ctx.lineTo(x, y - 20 * s);
  ctx.lineTo(x + 7 * s, y - 8 * s);
  ctx.lineTo(x + 16 * s, y - 16 * s);
  ctx.lineTo(x + 14 * s, y);
  ctx.closePath();
  fillStroke(ctx, vgrad(ctx, y - 20 * s, y, '#f0c85a', 0.3, -0.2), 2);
  ctx.fillStyle = '#e04a6a';
  ellipse(ctx, x, y - 5 * s, 2.4 * s, 2.4 * s);
  ctx.fill();
}

export const PAINTERS: Record<Archetype, Painter> = {
  slime, beast, bird, insect, humanoid, undead, golem, plant, serpent, elemental, eye: eyeball, dragon, giant, spirit,
};

/** 大約的高度（給血條位置用） */
export const ARCH_HEIGHT: Record<Archetype, number> = {
  slime: 50, beast: 62, bird: 76, insect: 46, humanoid: 82, undead: 82, golem: 90, plant: 70, serpent: 80, elemental: 96, eye: 86, dragon: 110, giant: 112, spirit: 86,
};

export function paintMonster(ctx: Ctx, arch: Archetype, palette: Pal, features: string[] | undefined, pose: MPose) {
  const f = new Set(features ?? []);
  if (arch === 'plant' && f.has('treant')) {
    PAINTERS.plant(ctx, palette, f, pose);
    return;
  }
  PAINTERS[arch](ctx, palette, f, pose);
}

export { easeOut };
