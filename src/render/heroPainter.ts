import type { HeroLook, OffhandKind, WeaponKind } from '@/core/types';
import { alpha, clamp01, easeInOut, easeOut, ellipse, eye, fillStroke, glow, lerp, OUTLINE, rrect, shade, shadow, star, vgrad, type Ctx } from './draw';

export interface Pose {
  t: number;
  /** 攻擊進度 0~1；-1 = 沒在攻擊 */
  attack: number;
  /** 走路相位（0 = 站著） */
  walk: number;
  /** 詠唱中 0~1 */
  cast: number;
  blink: boolean;
  /** 0~1 受擊 */
  hurt: number;
}

export const restPose = (t = 0): Pose => ({ t, attack: -1, walk: 0, cast: 0, blink: false, hurt: 0 });

const DEG = Math.PI / 180;

/** 依武器種類決定手臂角度（0 = 水平向前，正值 = 往下） */
function armAngle(weapon: WeaponKind, a: number, t: number): number {
  const idle = Math.sin(t * 2.2) * 3;
  if (a < 0) {
    switch (weapon) {
      case 'sword': return 55 + idle;
      case 'bow': return 5 + idle * 0.5;
      case 'staff': return 20 + idle;
      case 'mace': return 45 + idle;
    }
  }
  switch (weapon) {
    case 'sword':
    case 'mace': {
      if (a < 0.3) return lerp(55, -125, easeOut(a / 0.3));
      if (a < 0.6) return lerp(-125, 85, easeInOut((a - 0.3) / 0.3));
      return lerp(85, 55, (a - 0.6) / 0.4);
    }
    case 'bow': return lerp(0, 5, a);
    case 'staff': {
      if (a < 0.4) return lerp(20, -55, easeOut(a / 0.4));
      return lerp(-55, 20, (a - 0.4) / 0.6);
    }
  }
}

export function paintHero(ctx: Ctx, look: HeroLook, pose: Pose, scale = 1, hideWeapon = false) {
  const { t, attack: a } = pose;
  ctx.save();
  ctx.scale(scale, scale);
  shadow(ctx, 0, 0, 24);

  const walkPhase = pose.walk;
  const bob = walkPhase ? Math.abs(Math.sin(walkPhase * 2)) * -3 : Math.sin(t * 2.2) * 1.4;
  const lean = a >= 0 && look.weapon !== 'bow' ? Math.sin(clamp01(a) * Math.PI) * 6 : 0;
  ctx.translate(lean, bob);

  // 披風
  if (look.cape) {
    const wave = Math.sin(t * 3) * 3 + (walkPhase ? 4 : 0);
    ctx.beginPath();
    ctx.moveTo(-10, -50);
    ctx.quadraticCurveTo(-22 - wave, -28, -24 - wave, -8);
    ctx.lineTo(-6, -10);
    ctx.lineTo(4, -48);
    ctx.closePath();
    fillStroke(ctx, vgrad(ctx, -50, -8, look.cape, 0.1, -0.35), 2);
  }

  // 背後箭袋
  if (look.offhand === 'quiver') {
    ctx.save();
    ctx.translate(-12, -46);
    ctx.rotate(-25 * DEG);
    rrect(ctx, -5, -14, 10, 26, 3);
    fillStroke(ctx, vgrad(ctx, -14, 12, '#8a5a2f'), 2);
    for (let i = 0; i < 3; i++) {
      ctx.fillStyle = ['#f0f0f0', '#e04a4a', '#f0f0f0'][i];
      ctx.beginPath();
      ctx.moveTo(-3 + i * 3, -14);
      ctx.lineTo(-4.5 + i * 3, -20);
      ctx.lineTo(-1.5 + i * 3, -20);
      ctx.fill();
    }
    ctx.restore();
  }

  // 長髮（後層）
  if (look.hairStyle === 'long' || look.hairStyle === 'pony') {
    ctx.beginPath();
    if (look.hairStyle === 'long') {
      ctx.moveTo(-20, -72);
      ctx.quadraticCurveTo(-26, -44, -16, -34);
      ctx.lineTo(10, -36);
      ctx.quadraticCurveTo(16, -50, 14, -70);
    } else {
      const sw = Math.sin(t * 3) * 2;
      ctx.moveTo(-14, -78);
      ctx.quadraticCurveTo(-34 - sw, -66, -28 - sw, -44);
      ctx.quadraticCurveTo(-22, -52, -12, -62);
    }
    ctx.closePath();
    fillStroke(ctx, vgrad(ctx, -78, -34, look.hair), 2);
  }

  // 腿
  const legSwing = walkPhase ? Math.sin(walkPhase * 2) * 6 : 0;
  for (const [x, sw] of [[-6, -legSwing], [6, legSwing]] as const) {
    rrect(ctx, x - 4 + sw * 0.4, -20, 8, 16, 3);
    fillStroke(ctx, look.outfit2, 2);
    rrect(ctx, x - 5 + sw * 0.5, -7, 11, 7, 3);
    fillStroke(ctx, shade(look.outfit2, -0.45), 2);
  }

  // 身體
  rrect(ctx, -13, -48, 26, 30, 9);
  fillStroke(ctx, vgrad(ctx, -48, -18, look.outfit), 2.4);
  // 衣服下襬
  ctx.beginPath();
  ctx.moveTo(-14, -26);
  ctx.lineTo(14, -26);
  ctx.lineTo(16, -14);
  ctx.quadraticCurveTo(0, -10, -16, -14);
  ctx.closePath();
  fillStroke(ctx, shade(look.outfit, -0.12), 2);
  // 腰帶
  rrect(ctx, -13, -29, 26, 5, 2);
  fillStroke(ctx, look.trim, 1.6);
  ctx.fillStyle = shade(look.trim, 0.4);
  ctx.fillRect(-2, -28.5, 4, 4);
  // 領口
  ctx.beginPath();
  ctx.moveTo(-6, -48);
  ctx.lineTo(0, -41);
  ctx.lineTo(6, -48);
  ctx.strokeStyle = look.trim;
  ctx.lineWidth = 2;
  ctx.stroke();

  // 副手（盾、法珠、聖物）
  if (look.offhand === 'shield') paintShield(ctx, -12, -34, look);
  if (look.offhand === 'orb') paintOrb(ctx, -16, -36, t, look.trim);
  if (look.offhand === 'relic') paintRelic(ctx, -15, -34, t);

  // 頭
  const hx = 1, hy = -66;
  ellipse(ctx, hx, hy, 21, 20);
  fillStroke(ctx, vgrad(ctx, hy - 20, hy + 20, look.skin, 0.12, -0.1), 2.4);
  // 臉
  const blink = pose.blink;
  eye(ctx, hx + 6, hy + 2, 3.6, '#2a1a24', 0.5, blink);
  eye(ctx, hx + 15, hy + 2, 3.2, '#2a1a24', 0.5, blink);
  ctx.fillStyle = alpha('#ff7a8a', 0.35);
  ellipse(ctx, hx + 3, hy + 9, 4, 2.4);
  ctx.fill();
  ellipse(ctx, hx + 17, hy + 9, 3.5, 2.2);
  ctx.fill();
  ctx.strokeStyle = '#7a3a3a';
  ctx.lineWidth = 1.6;
  ctx.beginPath();
  if (pose.hurt > 0.3) ctx.arc(hx + 11, hy + 13, 2.2, Math.PI, 0);
  else ctx.arc(hx + 11, hy + 10, 2.4, 0.2, Math.PI - 0.2);
  ctx.stroke();

  paintHair(ctx, look, hx, hy, t);
  paintHat(ctx, look, hx, hy, t);

  if (hideWeapon) { ctx.restore(); return; }
  // 武器手
  const ang = armAngle(look.weapon, a, t) * DEG;
  ctx.save();
  ctx.translate(7, -43);
  ctx.rotate(ang);
  // 手臂
  rrect(ctx, -3, -4, 17, 8, 4);
  fillStroke(ctx, look.outfit, 2);
  ellipse(ctx, 16, 0, 4.6, 4.6);
  fillStroke(ctx, look.skin, 2);
  ctx.translate(16, 0);
  paintWeapon(ctx, look.weapon, look, a, t, pose.cast);
  ctx.restore();

  ctx.restore();
}

function paintHair(ctx: Ctx, look: HeroLook, hx: number, hy: number, t: number) {
  if (look.hairStyle === 'bald' || look.hat === 'hood' || look.hairStyle === 'hood') return;
  const c = look.hair;
  ctx.beginPath();
  switch (look.hairStyle) {
    case 'short':
    case 'long':
    case 'pony':
      ctx.moveTo(hx - 21, hy + 2);
      ctx.quadraticCurveTo(hx - 24, hy - 24, hx + 2, hy - 22);
      ctx.quadraticCurveTo(hx + 24, hy - 22, hx + 21, hy - 4);
      ctx.quadraticCurveTo(hx + 14, hy - 12, hx + 8, hy - 8);
      ctx.quadraticCurveTo(hx + 4, hy - 14, hx - 4, hy - 9);
      ctx.quadraticCurveTo(hx - 12, hy - 12, hx - 14, hy - 2);
      break;
    case 'spiky': {
      ctx.moveTo(hx - 21, hy + 2);
      const pts = 6;
      for (let i = 0; i <= pts; i++) {
        const ang = Math.PI + (i / pts) * Math.PI;
        const r = i % 2 === 0 ? 30 : 20;
        ctx.lineTo(hx + Math.cos(ang) * r, hy - 4 + Math.sin(ang) * r + Math.sin(t * 2 + i) * 0.6);
      }
      ctx.lineTo(hx + 21, hy - 2);
      ctx.quadraticCurveTo(hx + 6, hy - 12, hx - 14, hy - 2);
      break;
    }
  }
  ctx.closePath();
  fillStroke(ctx, vgrad(ctx, hy - 26, hy, c, 0.2, -0.15), 2.2);
  // 頭髮光澤
  ctx.strokeStyle = alpha('#ffffff', 0.35);
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.arc(hx - 4, hy - 8, 12, -2.4, -1.6);
  ctx.stroke();
}

function paintHat(ctx: Ctx, look: HeroLook, hx: number, hy: number, t: number) {
  switch (look.hat) {
    case 'wizard': {
      ctx.beginPath();
      ctx.moveTo(hx - 28, hy - 10);
      ctx.quadraticCurveTo(hx, hy - 20, hx + 28, hy - 10);
      ctx.quadraticCurveTo(hx, hy - 4, hx - 28, hy - 10);
      fillStroke(ctx, shade(look.outfit, -0.1), 2.2);
      ctx.beginPath();
      const tip = Math.sin(t * 1.5) * 3;
      ctx.moveTo(hx - 17, hy - 14);
      ctx.quadraticCurveTo(hx - 6, hy - 40, hx - 18 + tip, hy - 52);
      ctx.quadraticCurveTo(hx + 8, hy - 40, hx + 17, hy - 14);
      ctx.closePath();
      fillStroke(ctx, vgrad(ctx, hy - 52, hy - 14, look.outfit), 2.2);
      ctx.fillStyle = look.trim;
      star(ctx, hx + 2, hy - 28, 4.5);
      ctx.fill();
      break;
    }
    case 'hood': {
      ctx.beginPath();
      ctx.moveTo(hx - 24, hy + 10);
      ctx.quadraticCurveTo(hx - 28, hy - 28, hx + 2, hy - 26);
      ctx.quadraticCurveTo(hx + 28, hy - 26, hx + 24, hy - 2);
      ctx.quadraticCurveTo(hx + 18, hy - 14, hx + 4, hy - 12);
      ctx.quadraticCurveTo(hx - 10, hy - 10, hx - 14, hy + 8);
      ctx.closePath();
      fillStroke(ctx, vgrad(ctx, hy - 26, hy + 10, look.outfit2 === look.outfit ? shade(look.outfit, -0.2) : look.outfit), 2.4);
      break;
    }
    case 'helm':
    case 'horned': {
      ctx.beginPath();
      ctx.moveTo(hx - 22, hy + 2);
      ctx.quadraticCurveTo(hx - 24, hy - 26, hx + 1, hy - 25);
      ctx.quadraticCurveTo(hx + 25, hy - 26, hx + 22, hy - 2);
      ctx.lineTo(hx + 12, hy - 6);
      ctx.lineTo(hx - 12, hy - 4);
      ctx.closePath();
      fillStroke(ctx, vgrad(ctx, hy - 26, hy, '#b8bcc8', 0.3, -0.3), 2.4);
      ctx.fillStyle = look.trim;
      ctx.fillRect(hx - 1.5, hy - 25, 3, 20);
      if (look.hat === 'horned') {
        for (const s of [-1, 1]) {
          ctx.beginPath();
          ctx.moveTo(hx + s * 14, hy - 18);
          ctx.quadraticCurveTo(hx + s * 30, hy - 26, hx + s * 30, hy - 42);
          ctx.quadraticCurveTo(hx + s * 22, hy - 28, hx + s * 8, hy - 22);
          ctx.closePath();
          fillStroke(ctx, vgrad(ctx, hy - 42, hy - 18, '#f0e6d0'), 2);
        }
      }
      break;
    }
    case 'circlet': {
      ctx.strokeStyle = look.trim;
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.ellipse(hx, hy - 10, 21, 7, 0, Math.PI * 1.05, Math.PI * 1.95);
      ctx.stroke();
      ctx.fillStyle = '#7ad8ff';
      ellipse(ctx, hx + 6, hy - 17, 3, 3.5);
      fillStroke(ctx, '#7ad8ff', 1.4);
      glow(ctx, hx + 6, hy - 17, 7, '#bff0ff', 0.5 + Math.sin(t * 3) * 0.2);
      break;
    }
    case 'crown': {
      ctx.beginPath();
      ctx.moveTo(hx - 15, hy - 16);
      ctx.lineTo(hx - 17, hy - 32);
      ctx.lineTo(hx - 8, hy - 24);
      ctx.lineTo(hx, hy - 36);
      ctx.lineTo(hx + 8, hy - 24);
      ctx.lineTo(hx + 17, hy - 32);
      ctx.lineTo(hx + 15, hy - 16);
      ctx.closePath();
      fillStroke(ctx, vgrad(ctx, hy - 36, hy - 16, look.trim, 0.3, -0.2), 2);
      ctx.fillStyle = '#e04a6a';
      ellipse(ctx, hx, hy - 20, 2.6, 2.6);
      ctx.fill();
      break;
    }
  }
}

function paintShield(ctx: Ctx, x: number, y: number, look: HeroLook) {
  ctx.save();
  ctx.translate(x, y);
  ctx.beginPath();
  ctx.moveTo(-10, -13);
  ctx.quadraticCurveTo(0, -17, 10, -13);
  ctx.lineTo(10, 2);
  ctx.quadraticCurveTo(8, 12, 0, 16);
  ctx.quadraticCurveTo(-8, 12, -10, 2);
  ctx.closePath();
  fillStroke(ctx, vgrad(ctx, -17, 16, look.cape ?? '#3a5aa8', 0.2, -0.3), 2.4);
  ctx.strokeStyle = look.trim;
  ctx.lineWidth = 2.2;
  ctx.stroke();
  ctx.fillStyle = look.trim;
  star(ctx, 0, -1, 5, 4, 0.4);
  ctx.fill();
  ctx.restore();
}

function paintOrb(ctx: Ctx, x: number, y: number, t: number, color: string) {
  const fy = y + Math.sin(t * 2.5) * 3;
  glow(ctx, x, fy, 14, '#8ab8ff', 0.5);
  ellipse(ctx, x, fy, 7, 7);
  fillStroke(ctx, ctx.createRadialGradient(x - 2, fy - 2, 1, x, fy, 7), 1.6);
  const g = ctx.createRadialGradient(x - 2, fy - 2, 1, x, fy, 7);
  g.addColorStop(0, '#ffffff');
  g.addColorStop(0.4, '#8ab8ff');
  g.addColorStop(1, '#3a4ab8');
  ctx.fillStyle = g;
  ellipse(ctx, x, fy, 6.5, 6.5);
  ctx.fill();
  void color;
}

function paintRelic(ctx: Ctx, x: number, y: number, t: number) {
  ctx.save();
  ctx.translate(x, y);
  rrect(ctx, -7, -9, 14, 18, 2);
  fillStroke(ctx, vgrad(ctx, -9, 9, '#8a5a2f'), 2);
  ctx.fillStyle = '#f0d070';
  ctx.fillRect(-1.2, -6, 2.4, 12);
  ctx.fillRect(-4.5, -2.5, 9, 2.4);
  glow(ctx, 0, 0, 12, '#fff2a8', 0.25 + Math.sin(t * 2) * 0.1);
  ctx.restore();
}

/** 在手的位置畫武器（座標系已旋轉到手臂方向，x 往手臂延伸方向） */
function paintWeapon(ctx: Ctx, w: WeaponKind, look: HeroLook, a: number, t: number, cast: number) {
  switch (w) {
    case 'sword': {
      // 劍與手臂垂直，刃朝上（相對手臂）
      ctx.save();
      ctx.rotate(-90 * DEG);
      rrect(ctx, -2, -6, 4, 10, 1.5);
      fillStroke(ctx, '#5a3a24', 1.6);
      rrect(ctx, -8, -8, 16, 4, 2);
      fillStroke(ctx, look.trim, 1.6);
      ctx.beginPath();
      ctx.moveTo(-4, -8);
      ctx.lineTo(-4, -42);
      ctx.lineTo(0, -50);
      ctx.lineTo(4, -42);
      ctx.lineTo(4, -8);
      ctx.closePath();
      const metal = look.metal ?? '#e8eef8';
      const g = ctx.createLinearGradient(-4, 0, 4, 0);
      g.addColorStop(0, metal);
      g.addColorStop(0.5, '#ffffff');
      g.addColorStop(1, shade(metal, -0.3));
      fillStroke(ctx, g, 1.8);
      if (look.glow) glow(ctx, 0, -28, 22 + Math.sin(t * 4) * 3, look.glow, 0.45);
      if (a > 0.25 && a < 0.65) {
        ctx.strokeStyle = 'rgba(255,255,255,0.5)';
        ctx.lineWidth = 6;
        ctx.beginPath();
        ctx.moveTo(0, -48);
        ctx.lineTo(0, -10);
        ctx.stroke();
      }
      ctx.restore();
      break;
    }
    case 'mace': {
      ctx.save();
      ctx.rotate(-90 * DEG);
      rrect(ctx, -2.5, -34, 5, 40, 2);
      fillStroke(ctx, '#6a4a2a', 1.8);
      if (look.glow) glow(ctx, 0, -38, 22 + Math.sin(t * 4) * 3, look.glow, 0.5);
      ellipse(ctx, 0, -38, 9, 9);
      fillStroke(ctx, vgrad(ctx, -47, -29, look.metal ?? look.trim, 0.35, -0.25), 2);
      for (let i = 0; i < 6; i++) {
        const ang = (i / 6) * Math.PI * 2;
        ctx.beginPath();
        ctx.moveTo(Math.cos(ang) * 8, -38 + Math.sin(ang) * 8);
        ctx.lineTo(Math.cos(ang) * 13, -38 + Math.sin(ang) * 13);
        ctx.strokeStyle = OUTLINE;
        ctx.lineWidth = 3;
        ctx.stroke();
      }
      if (a > 0.3 && a < 0.7) glow(ctx, 0, -38, 20, '#fff2a8', 0.6);
      ctx.restore();
      break;
    }
    case 'staff': {
      ctx.save();
      ctx.rotate(-90 * DEG);
      rrect(ctx, -2.5, -46, 5, 62, 2);
      fillStroke(ctx, vgrad(ctx, -46, 16, '#7a5a3a'), 1.8);
      // 杖頭
      ctx.beginPath();
      ctx.moveTo(-7, -46);
      ctx.quadraticCurveTo(-10, -58, 0, -62);
      ctx.quadraticCurveTo(10, -58, 7, -46);
      ctx.strokeStyle = look.trim;
      ctx.lineWidth = 3;
      ctx.stroke();
      const power = Math.max(cast, a >= 0 ? Math.sin(clamp01(a) * Math.PI) : 0);
      glow(ctx, 0, -54, 14 + power * 18 + (look.glow ? 8 : 0), look.glow ?? '#8ad8ff', 0.5 + power * 0.4);
      const g = ctx.createRadialGradient(-2, -56, 1, 0, -54, 6);
      g.addColorStop(0, '#ffffff');
      g.addColorStop(0.5, '#8ad8ff');
      g.addColorStop(1, '#3a6ad8');
      ellipse(ctx, 0, -54, 5.5 + Math.sin(t * 4) * 0.5, 5.5);
      fillStroke(ctx, g, 1.4);
      ctx.restore();
      break;
    }
    case 'bow': {
      // 弓垂直，弓弦往後拉
      const draw = a >= 0 ? (a < 0.55 ? easeOut(a / 0.55) : 0) : 0;
      ctx.save();
      ctx.beginPath();
      ctx.moveTo(0, -26);
      ctx.quadraticCurveTo(14, 0, 0, 26);
      ctx.strokeStyle = OUTLINE;
      ctx.lineWidth = 6;
      ctx.stroke();
      ctx.strokeStyle = look.metal ? shade(look.metal, -0.25) : '#a8743a';
      ctx.lineWidth = 3.6;
      ctx.stroke();
      if (look.glow) glow(ctx, 6, 0, 24 + Math.sin(t * 4) * 3, look.glow, 0.35);
      ctx.strokeStyle = 'rgba(240,240,240,0.9)';
      ctx.lineWidth = 1.2;
      ctx.beginPath();
      ctx.moveTo(0, -26);
      ctx.lineTo(-draw * 16, 0);
      ctx.lineTo(0, 26);
      ctx.stroke();
      if (draw > 0.05 || a < 0) {
        // 箭
        const ax = -draw * 16;
        ctx.strokeStyle = '#6a4a2a';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(ax, 0);
        ctx.lineTo(ax + 30, 0);
        ctx.stroke();
        ctx.fillStyle = '#d8dce8';
        ctx.beginPath();
        ctx.moveTo(ax + 30, -3);
        ctx.lineTo(ax + 36, 0);
        ctx.lineTo(ax + 30, 3);
        ctx.fill();
      }
      ctx.restore();
      void t;
      break;
    }
  }
}

/** 小頭像（UI 用）：只畫頭與帽子 */
export function paintPortrait(ctx: Ctx, look: HeroLook, size: number) {
  ctx.save();
  ctx.translate(size / 2 - 1, size * 0.98);
  const s = size / 70;
  ctx.scale(s, s);
  ctx.translate(0, 36);
  paintHero(ctx, { ...look, offhand: 'none' as OffhandKind | 'none', cape: undefined }, restPose(0.5), 1, true);
  ctx.restore();
}
