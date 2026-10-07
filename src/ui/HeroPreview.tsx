import { useEffect, useRef } from 'preact/hooks';
import type { HeroLook } from '@/core/types';
import { paintHero } from '@/render/heroPainter';
import { classImage } from '@/render/images';

/** 在小畫布上播放英雄待機／攻擊動畫；art 依序嘗試的職業美術圖（轉職優先） */
export function HeroPreview({ look, art, attackEvery = 2.6, size = 200 }: { look: HeroLook; art?: (string | null | undefined)[]; attackEvery?: number; size?: number }) {
  const ref = useRef<HTMLCanvasElement>(null);
  const lookRef = useRef(look);
  lookRef.current = look;
  const artRef = useRef(art);
  artRef.current = art;
  useEffect(() => {
    const c = ref.current!;
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    c.width = size * dpr;
    c.height = size * dpr;
    const ctx = c.getContext('2d')!;
    let raf = 0;
    const start = performance.now();
    const draw = (now: number) => {
      raf = requestAnimationFrame(draw);
      const t = (now - start) / 1000;
      const cyc = attackEvery > 0 ? t % attackEvery : 99;
      const attack = cyc < 0.5 ? cyc / 0.5 : -1;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.clearRect(0, 0, size, size);
      let img: HTMLImageElement | null = null;
      for (const id of artRef.current ?? []) if (id && (img = classImage(id))) break;
      ctx.save();
      if (img) {
        const h = size * 0.86;
        const w = Math.min(size * 0.96, (img.width / img.height) * h);
        const hh = (img.height / img.width) * w;
        const breath = Math.sin(t * 2.4);
        const lunge = attack >= 0 ? Math.sin(attack * Math.PI) * size * 0.05 : 0;
        ctx.translate(size / 2 + lunge, size * 0.95);
        ctx.fillStyle = 'rgba(0,0,0,0.25)';
        ctx.beginPath();
        ctx.ellipse(0, 0, w * 0.32, w * 0.06, 0, 0, Math.PI * 2);
        ctx.fill();
        const sy = 1 + breath * 0.012;
        ctx.scale(1 / sy, sy);
        ctx.drawImage(img, -w / 2, -hh + breath * 1.5, w, hh);
      } else {
        ctx.translate(size * 0.45, size * 0.86);
        const sc = size / 150;
        paintHero(ctx, lookRef.current, { t, attack, walk: 0, cast: 0, blink: (t % 3.7) < 0.12, hurt: 0 }, sc);
      }
      ctx.restore();
    };
    raf = requestAnimationFrame(draw);
    return () => cancelAnimationFrame(raf);
  }, [size, attackEvery]);
  return <canvas ref={ref} style={{ width: size + 'px', maxWidth: '100%', aspectRatio: '1' }} />;
}
