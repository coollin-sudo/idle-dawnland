import type { ClassId, HeroLook, ItemSlotKind } from '@/core/types';
import { alpha, ellipse, fillStroke, glow, rrect, shade, star, vgrad, type Ctx } from './draw';
import { paintPortrait } from './heroPainter';
import { paintMonster } from './monsterPainter';
import type { Archetype } from '@/core/types';

const cache = new Map<string, string>();
const SIZE = 64;

function render(key: string, fn: (ctx: Ctx) => void, size = SIZE): string {
  const hit = cache.get(key);
  if (hit) return hit;
  if (typeof document === 'undefined') return '';
  const c = document.createElement('canvas');
  c.width = size * 2;
  c.height = size * 2;
  const ctx = c.getContext('2d')!;
  ctx.scale(2 * (size / SIZE), 2 * (size / SIZE));
  ctx.lineJoin = 'round';
  ctx.lineCap = 'round';
  fn(ctx);
  const url = c.toDataURL();
  cache.set(key, url);
  return url;
}

/** 依物品等級的材質顏色 */
const TIER_METAL = ['#8a7a6a', '#9aa0a8', '#8ea6c0', '#d8dce8', '#9ae0f0', '#b8e08a', '#b89aff', '#f0e6d0', '#6a8aff', '#ffd76a', '#fff6d8', '#ff9ad8', '#ffffff'];
const TIER_CLOTH = ['#7a5a3a', '#6a6a7a', '#4a6a8a', '#3a5aa8', '#2a8a9a', '#3a8a4a', '#6a3aa8', '#8a3a2a', '#2a2a6a', '#c8902a', '#e8d8a8', '#a83a8a', '#ffffff'];

export function itemIcon(kind: ItemSlotKind, classId: ClassId | undefined, tier: number): string {
  const metal = TIER_METAL[Math.min(tier, TIER_METAL.length - 1)];
  const cloth = TIER_CLOTH[Math.min(tier, TIER_CLOTH.length - 1)];
  return render(`item:${kind}:${classId ?? ''}:${tier}`, ctx => {
    ctx.translate(32, 32);
    switch (kind) {
      case 'weapon': weaponIcon(ctx, classId ?? 'warrior', metal, cloth); break;
      case 'offhand': offhandIcon(ctx, classId ?? 'warrior', metal, cloth); break;
      case 'helmet': {
        ctx.beginPath();
        ctx.moveTo(-18, 10);
        ctx.quadraticCurveTo(-20, -20, 0, -20);
        ctx.quadraticCurveTo(20, -20, 18, 10);
        ctx.lineTo(10, 14);
        ctx.lineTo(10, 2);
        ctx.lineTo(-10, 2);
        ctx.lineTo(-10, 14);
        ctx.closePath();
        fillStroke(ctx, vgrad(ctx, -20, 14, metal, 0.35, -0.35), 2.4);
        ctx.fillStyle = cloth;
        ctx.fillRect(-2, -20, 4, 22);
        ctx.beginPath();
        ctx.moveTo(0, -20);
        ctx.quadraticCurveTo(6, -30, 14, -26);
        fillStroke(ctx, cloth, 1.6);
        break;
      }
      case 'armor': {
        ctx.beginPath();
        ctx.moveTo(-10, -20);
        ctx.lineTo(-22, -12);
        ctx.lineTo(-20, 2);
        ctx.lineTo(-14, 0);
        ctx.lineTo(-14, 20);
        ctx.lineTo(14, 20);
        ctx.lineTo(14, 0);
        ctx.lineTo(20, 2);
        ctx.lineTo(22, -12);
        ctx.lineTo(10, -20);
        ctx.quadraticCurveTo(0, -12, -10, -20);
        ctx.closePath();
        fillStroke(ctx, vgrad(ctx, -20, 20, metal, 0.3, -0.35), 2.4);
        ctx.strokeStyle = shade(metal, -0.4);
        ctx.lineWidth = 1.6;
        ctx.beginPath();
        ctx.moveTo(0, -12);
        ctx.lineTo(0, 20);
        ctx.moveTo(-14, 6);
        ctx.lineTo(14, 6);
        ctx.stroke();
        ctx.fillStyle = cloth;
        ctx.fillRect(-14, 10, 28, 4);
        break;
      }
      case 'gloves': {
        ctx.rotate(-0.3);
        rrect(ctx, -12, -6, 24, 24, 6);
        fillStroke(ctx, vgrad(ctx, -6, 18, metal, 0.3, -0.3), 2.2);
        for (let i = 0; i < 4; i++) {
          rrect(ctx, -12 + i * 6, -20, 5.6, 16, 2.5);
          fillStroke(ctx, vgrad(ctx, -20, -4, metal, 0.3, -0.2), 1.8);
        }
        rrect(ctx, -14, 12, 28, 8, 3);
        fillStroke(ctx, cloth, 1.8);
        break;
      }
      case 'belt': {
        rrect(ctx, -24, -6, 48, 12, 4);
        fillStroke(ctx, vgrad(ctx, -6, 6, cloth, 0.2, -0.3), 2.2);
        rrect(ctx, -8, -10, 16, 20, 4);
        fillStroke(ctx, vgrad(ctx, -10, 10, metal, 0.4, -0.3), 2.2);
        ctx.fillStyle = shade(metal, -0.5);
        ctx.fillRect(-2, -6, 4, 12);
        break;
      }
      case 'boots': {
        for (const dx of [-8, 8]) {
          ctx.beginPath();
          ctx.moveTo(dx - 7, -20);
          ctx.lineTo(dx + 5, -20);
          ctx.lineTo(dx + 5, 6);
          ctx.lineTo(dx + 14, 10);
          ctx.lineTo(dx + 14, 18);
          ctx.lineTo(dx - 8, 18);
          ctx.closePath();
          fillStroke(ctx, vgrad(ctx, -20, 18, dx < 0 ? shade(cloth, -0.2) : cloth, 0.2, -0.3), 2.2);
          ctx.fillStyle = metal;
          ctx.fillRect(dx - 7, -20, 12, 4);
        }
        break;
      }
      case 'amulet': {
        ctx.strokeStyle = metal;
        ctx.lineWidth = 2.4;
        ctx.beginPath();
        ctx.arc(0, -10, 16, Math.PI * 0.1, Math.PI * 0.9, true);
        ctx.stroke();
        glow(ctx, 0, 10, 18, cloth, 0.5);
        ctx.beginPath();
        ctx.moveTo(0, -2);
        ctx.lineTo(10, 10);
        ctx.lineTo(0, 22);
        ctx.lineTo(-10, 10);
        ctx.closePath();
        fillStroke(ctx, vgrad(ctx, -2, 22, cloth, 0.5, -0.2), 2.2);
        ctx.fillStyle = 'rgba(255,255,255,0.7)';
        ellipse(ctx, -3, 6, 2.5, 3.5);
        ctx.fill();
        break;
      }
      case 'ring': {
        ctx.lineWidth = 7;
        ctx.strokeStyle = '#1b1420';
        ellipse(ctx, 0, 6, 15, 13);
        ctx.stroke();
        ctx.lineWidth = 4.4;
        ctx.strokeStyle = metal;
        ctx.stroke();
        glow(ctx, 0, -8, 14, cloth, 0.5);
        ellipse(ctx, 0, -8, 7, 7);
        fillStroke(ctx, vgrad(ctx, -15, -1, cloth, 0.5, -0.2), 2);
        break;
      }
    }
  });
}

function weaponIcon(ctx: Ctx, cls: ClassId, metal: string, cloth: string) {
  ctx.rotate(-Math.PI / 4);
  switch (cls) {
    case 'warrior': {
      ctx.beginPath();
      ctx.moveTo(-4, -4);
      ctx.lineTo(-4, -26);
      ctx.lineTo(0, -32);
      ctx.lineTo(4, -26);
      ctx.lineTo(4, -4);
      ctx.closePath();
      const g = ctx.createLinearGradient(-4, 0, 4, 0);
      g.addColorStop(0, shade(metal, 0.4));
      g.addColorStop(1, shade(metal, -0.3));
      fillStroke(ctx, g, 2);
      rrect(ctx, -12, -5, 24, 5, 2);
      fillStroke(ctx, cloth, 1.8);
      rrect(ctx, -2.5, 0, 5, 16, 2);
      fillStroke(ctx, '#5a3a24', 1.8);
      ellipse(ctx, 0, 18, 4, 4);
      fillStroke(ctx, metal, 1.6);
      break;
    }
    case 'ranger': {
      ctx.rotate(Math.PI / 4);
      ctx.beginPath();
      ctx.moveTo(-6, -26);
      ctx.quadraticCurveTo(18, 0, -6, 26);
      ctx.strokeStyle = '#1b1420';
      ctx.lineWidth = 7;
      ctx.stroke();
      ctx.strokeStyle = metal;
      ctx.lineWidth = 4.4;
      ctx.stroke();
      ctx.strokeStyle = '#f0f0f0';
      ctx.lineWidth = 1.2;
      ctx.beginPath();
      ctx.moveTo(-6, -26);
      ctx.lineTo(-6, 26);
      ctx.stroke();
      ctx.fillStyle = cloth;
      ctx.fillRect(2, -4, 6, 8);
      break;
    }
    case 'mage': {
      rrect(ctx, -2.5, -14, 5, 42, 2);
      fillStroke(ctx, vgrad(ctx, -14, 28, '#7a5a3a'), 1.8);
      ctx.beginPath();
      ctx.moveTo(-8, -14);
      ctx.quadraticCurveTo(-10, -28, 0, -30);
      ctx.quadraticCurveTo(10, -28, 8, -14);
      ctx.strokeStyle = metal;
      ctx.lineWidth = 3;
      ctx.stroke();
      glow(ctx, 0, -22, 14, cloth, 0.7);
      ellipse(ctx, 0, -22, 6, 6);
      fillStroke(ctx, vgrad(ctx, -28, -16, shade(cloth, 0.4), 0.5, -0.1), 1.6);
      break;
    }
    case 'cleric': {
      rrect(ctx, -2.5, -10, 5, 36, 2);
      fillStroke(ctx, '#6a4a2a', 1.8);
      ellipse(ctx, 0, -18, 11, 11);
      fillStroke(ctx, vgrad(ctx, -29, -7, metal, 0.4, -0.3), 2.2);
      ctx.fillStyle = cloth;
      star(ctx, 0, -18, 6, 4, 0.4);
      ctx.fill();
      break;
    }
  }
}

function offhandIcon(ctx: Ctx, cls: ClassId, metal: string, cloth: string) {
  switch (cls) {
    case 'warrior':
      ctx.beginPath();
      ctx.moveTo(-18, -20);
      ctx.quadraticCurveTo(0, -26, 18, -20);
      ctx.lineTo(18, 2);
      ctx.quadraticCurveTo(14, 18, 0, 26);
      ctx.quadraticCurveTo(-14, 18, -18, 2);
      ctx.closePath();
      fillStroke(ctx, vgrad(ctx, -26, 26, cloth, 0.3, -0.35), 2.4);
      ctx.strokeStyle = metal;
      ctx.lineWidth = 3;
      ctx.stroke();
      ctx.fillStyle = metal;
      star(ctx, 0, 0, 9, 4, 0.4);
      ctx.fill();
      break;
    case 'ranger':
      ctx.rotate(-0.3);
      rrect(ctx, -9, -16, 18, 36, 5);
      fillStroke(ctx, vgrad(ctx, -16, 20, '#8a5a2f'), 2.2);
      ctx.fillStyle = metal;
      ctx.fillRect(-9, -2, 18, 4);
      for (let i = 0; i < 3; i++) {
        ctx.strokeStyle = '#6a4a2a';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(-5 + i * 5, -16);
        ctx.lineTo(-5 + i * 5, -26);
        ctx.stroke();
        ctx.fillStyle = cloth;
        ctx.beginPath();
        ctx.moveTo(-8 + i * 5, -26);
        ctx.lineTo(-5 + i * 5, -32);
        ctx.lineTo(-2 + i * 5, -26);
        ctx.fill();
      }
      break;
    case 'mage': {
      glow(ctx, 0, 0, 30, cloth, 0.6);
      const g = ctx.createRadialGradient(-5, -5, 2, 0, 0, 18);
      g.addColorStop(0, '#ffffff');
      g.addColorStop(0.4, shade(cloth, 0.4));
      g.addColorStop(1, shade(cloth, -0.3));
      ellipse(ctx, 0, 0, 16, 16);
      fillStroke(ctx, g, 2.4);
      ctx.strokeStyle = metal;
      ctx.lineWidth = 2.4;
      ctx.beginPath();
      ctx.ellipse(0, 0, 22, 7, -0.4, 0, Math.PI * 2);
      ctx.stroke();
      break;
    }
    case 'cleric':
      rrect(ctx, -15, -20, 30, 40, 4);
      fillStroke(ctx, vgrad(ctx, -20, 20, cloth, 0.2, -0.3), 2.4);
      ctx.fillStyle = metal;
      ctx.fillRect(-2.5, -12, 5, 24);
      ctx.fillRect(-9, -5, 18, 5);
      ctx.strokeStyle = metal;
      ctx.lineWidth = 2;
      ctx.strokeRect(-12, -17, 24, 34);
      break;
  }
}

// =====================================================================
// 貨幣圖示
// =====================================================================
export type CurrencyKey = 'gold' | 'gems' | 'stones' | 'essence' | 'shards' | 'petFood' | 'protect' | 'starSouls' | 'egg0' | 'egg1' | 'egg2' | 'potion0' | 'potion1' | 'potion2' | 'xp' | 'keys';

export function currencyIcon(key: CurrencyKey): string {
  return render('cur:' + key, ctx => {
    ctx.translate(32, 32);
    switch (key) {
      case 'gold':
        for (const [x, y] of [[-8, 6], [8, 6], [0, -6]] as const) {
          ellipse(ctx, x, y, 14, 14);
          fillStroke(ctx, vgrad(ctx, y - 14, y + 14, '#ffd34a', 0.4, -0.25), 2.4);
          ctx.strokeStyle = '#b8862a';
          ctx.lineWidth = 2;
          ellipse(ctx, x, y, 9, 9);
          ctx.stroke();
        }
        break;
      case 'gems': {
        ctx.beginPath();
        ctx.moveTo(-20, -6);
        ctx.lineTo(-10, -18);
        ctx.lineTo(10, -18);
        ctx.lineTo(20, -6);
        ctx.lineTo(0, 22);
        ctx.closePath();
        fillStroke(ctx, vgrad(ctx, -18, 22, '#6af0ff', 0.4, -0.3), 2.4);
        ctx.strokeStyle = alpha('#ffffff', 0.7);
        ctx.lineWidth = 1.6;
        ctx.beginPath();
        ctx.moveTo(-20, -6);
        ctx.lineTo(20, -6);
        ctx.moveTo(-10, -18);
        ctx.lineTo(-6, -6);
        ctx.lineTo(0, 22);
        ctx.lineTo(6, -6);
        ctx.lineTo(10, -18);
        ctx.stroke();
        break;
      }
      case 'stones': {
        ctx.beginPath();
        ctx.moveTo(-16, -10);
        ctx.lineTo(-4, -20);
        ctx.lineTo(16, -14);
        ctx.lineTo(20, 8);
        ctx.lineTo(4, 20);
        ctx.lineTo(-18, 12);
        ctx.closePath();
        fillStroke(ctx, vgrad(ctx, -20, 20, '#5a8aff', 0.35, -0.35), 2.4);
        ctx.strokeStyle = '#d8eaff';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(-6, -8);
        ctx.lineTo(4, -2);
        ctx.lineTo(-2, 8);
        ctx.moveTo(4, -2);
        ctx.lineTo(10, 4);
        ctx.stroke();
        glow(ctx, 2, 0, 16, '#8ab8ff', 0.4);
        break;
      }
      case 'essence':
        glow(ctx, 0, 0, 26, '#c070ff', 0.7);
        ctx.strokeStyle = '#f0d0ff';
        ctx.lineWidth = 3;
        ctx.beginPath();
        for (let a = 0; a < 12; a += 0.2) ctx.lineTo(Math.cos(a) * a * 1.5, Math.sin(a) * a * 1.5);
        ctx.stroke();
        break;
      case 'shards':
        for (const [x, y, r] of [[-8, 4, -0.4], [6, 0, 0.3], [0, -6, 0]] as const) {
          ctx.save();
          ctx.translate(x, y);
          ctx.rotate(r);
          ctx.beginPath();
          ctx.moveTo(0, -18);
          ctx.lineTo(7, 0);
          ctx.lineTo(0, 16);
          ctx.lineTo(-7, 0);
          ctx.closePath();
          fillStroke(ctx, vgrad(ctx, -18, 16, '#ffa53a', 0.45, -0.2), 2);
          ctx.restore();
        }
        break;
      case 'petFood':
        ctx.rotate(-0.6);
        ellipse(ctx, 4, -2, 16, 12);
        fillStroke(ctx, vgrad(ctx, -14, 10, '#d8704a', 0.3, -0.2), 2.4);
        rrect(ctx, -22, -3, 14, 6, 3);
        fillStroke(ctx, '#f2e8d0', 2);
        ellipse(ctx, -22, -5, 4, 4);
        fillStroke(ctx, '#f2e8d0', 1.6);
        ellipse(ctx, -22, 2, 4, 4);
        fillStroke(ctx, '#f2e8d0', 1.6);
        break;
      case 'protect':
        rrect(ctx, -16, -18, 32, 36, 4);
        fillStroke(ctx, vgrad(ctx, -18, 18, '#f0e0b0', 0.2, -0.2), 2.2);
        ellipse(ctx, 0, -18, 18, 4);
        fillStroke(ctx, '#d8c088', 2);
        ellipse(ctx, 0, 18, 18, 4);
        fillStroke(ctx, '#d8c088', 2);
        ctx.fillStyle = '#4a8aff';
        ctx.beginPath();
        ctx.moveTo(0, -8);
        ctx.lineTo(9, -4);
        ctx.lineTo(7, 6);
        ctx.lineTo(0, 11);
        ctx.lineTo(-7, 6);
        ctx.lineTo(-9, -4);
        ctx.fill();
        break;
      case 'starSouls':
        glow(ctx, 0, 0, 28, '#8a6aff', 0.7);
        ctx.fillStyle = '#ffffff';
        star(ctx, 0, 0, 16, 5, 0.45);
        fillStroke(ctx, vgrad(ctx, -16, 16, '#d8c8ff', 0.5, -0.2), 2);
        break;
      case 'egg0':
      case 'egg1':
      case 'egg2': {
        const c = key === 'egg0' ? '#e8dcc0' : key === 'egg1' ? '#7ab8ff' : '#ffa53a';
        if (key === 'egg2') glow(ctx, 0, 2, 28, c, 0.5);
        ctx.beginPath();
        ctx.moveTo(0, -22);
        ctx.bezierCurveTo(16, -22, 18, 8, 16, 12);
        ctx.bezierCurveTo(12, 24, -12, 24, -16, 12);
        ctx.bezierCurveTo(-18, 8, -16, -22, 0, -22);
        fillStroke(ctx, vgrad(ctx, -22, 22, c, 0.35, -0.2), 2.4);
        ctx.fillStyle = alpha(shade(c, -0.4), 0.7);
        for (const [x, y, r] of [[-6, -8, 3.5], [6, 2, 4], [-4, 10, 3]] as const) {
          ellipse(ctx, x, y, r, r);
          ctx.fill();
        }
        break;
      }
      case 'potion0':
      case 'potion1':
      case 'potion2': {
        const c = ['#ff6a6a', '#ff3a6a', '#e02a8a'][Number(key.slice(-1))];
        const s = 0.85 + Number(key.slice(-1)) * 0.08;
        ctx.scale(s, s);
        rrect(ctx, -5, -24, 10, 10, 2);
        fillStroke(ctx, '#c8a878', 2);
        ctx.beginPath();
        ctx.moveTo(-5, -14);
        ctx.lineTo(-16, 4);
        ctx.quadraticCurveTo(-18, 22, 0, 22);
        ctx.quadraticCurveTo(18, 22, 16, 4);
        ctx.lineTo(5, -14);
        ctx.closePath();
        fillStroke(ctx, alpha('#e8f4ff', 0.6), 2.4);
        ctx.beginPath();
        ctx.moveTo(-13, 4);
        ctx.quadraticCurveTo(-15, 20, 0, 20);
        ctx.quadraticCurveTo(15, 20, 13, 4);
        ctx.closePath();
        ctx.fillStyle = vgrad(ctx, 4, 20, c, 0.3, -0.2);
        ctx.fill();
        ctx.fillStyle = 'rgba(255,255,255,0.6)';
        ellipse(ctx, -7, 8, 2.5, 5, 0.3);
        ctx.fill();
        break;
      }
      case 'xp':
        ctx.fillStyle = '#7ad8ff';
        star(ctx, 0, 0, 20, 4, 0.4);
        fillStroke(ctx, vgrad(ctx, -20, 20, '#8ae8ff', 0.4, -0.2), 2);
        break;
      case 'keys':
        ellipse(ctx, -10, -10, 9, 9);
        fillStroke(ctx, '#ffd34a', 2.4);
        rrect(ctx, -4, -6, 26, 6, 2);
        fillStroke(ctx, '#ffd34a', 2);
        break;
    }
  });
}

export function portrait(look: HeroLook, size = 64): string {
  return render('portrait:' + JSON.stringify(look) + size, ctx => paintPortrait(ctx, look, SIZE), size);
}

export function creaturePortrait(arch: Archetype, palette: [string, string, string], features: string[] | undefined, size = 64): string {
  return render(`creature:${arch}:${palette.join()}:${(features ?? []).join()}:${size}`, ctx => {
    const heights: Record<string, number> = { dragon: 120, giant: 120, golem: 95, elemental: 100, eye: 90, bird: 80, humanoid: 85, undead: 85, serpent: 85, spirit: 90, plant: (features ?? []).includes('treant') ? 130 : 70 };
    const h = heights[arch] ?? 64;
    const s = 54 / h;
    ctx.translate(32, 60);
    ctx.scale(s, s);
    paintMonster(ctx, arch, palette, (features ?? []).filter(f => f !== 'small'), { t: 0.3, attack: -1, cast: 0, seed: 1 });
  }, size);
}
