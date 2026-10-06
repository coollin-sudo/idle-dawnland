import { useEffect, useRef } from 'preact/hooks';
import type { HeroLook } from '@/core/types';
import { paintHero } from '@/render/heroPainter';

/** 在小畫布上播放英雄待機／攻擊動畫 */
export function HeroPreview({ look, attackEvery = 2.6, size = 200 }: { look: HeroLook; attackEvery?: number; size?: number }) {
  const ref = useRef<HTMLCanvasElement>(null);
  const lookRef = useRef(look);
  lookRef.current = look;
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
      ctx.save();
      ctx.translate(size * 0.45, size * 0.86);
      const sc = size / 150;
      paintHero(ctx, lookRef.current, { t, attack, walk: 0, cast: 0, blink: (t % 3.7) < 0.12, hurt: 0 }, sc);
      ctx.restore();
    };
    raf = requestAnimationFrame(draw);
    return () => cancelAnimationFrame(raf);
  }, [size, attackEvery]);
  return <canvas ref={ref} style={{ width: size + 'px', maxWidth: '100%', aspectRatio: '1' }} />;
}
