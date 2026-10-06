import { useEffect, useRef } from 'preact/hooks';
import { MONSTERS } from '@/data/monsters';
import { PETS } from '@/data/pets';
import { ADVANCES, CLASSES } from '@/data/classes';
import { paintMonster } from '@/render/monsterPainter';
import { paintHero } from '@/render/heroPainter';
import type { Archetype, HeroLook } from '@/core/types';

/** 美術檢視頁（網址加上 #gallery）：大尺寸播放所有角色與怪物的動畫 */
function Cell({ name, draw }: { name: string; draw: (ctx: CanvasRenderingContext2D, t: number, attack: number) => void }) {
  const ref = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    const c = ref.current!;
    c.width = 360; c.height = 360;
    const ctx = c.getContext('2d')!;
    let raf = 0;
    const t0 = performance.now() + Math.random() * 1000;
    const loop = (now: number) => {
      raf = requestAnimationFrame(loop);
      const t = (now - t0) / 1000;
      const cyc = t % 3;
      ctx.setTransform(2, 0, 0, 2, 0, 0);
      ctx.clearRect(0, 0, 180, 180);
      ctx.save();
      ctx.translate(90, 160);
      draw(ctx, t, cyc < 0.5 ? cyc / 0.5 : -1);
      ctx.restore();
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, []);
  return (
    <div class="card" style={{ textAlign: 'center', padding: '6px' }}>
      <canvas ref={ref} style={{ width: '180px', height: '180px' }} />
      <div class="small">{name}</div>
    </div>
  );
}

const ARCH_H: Record<string, number> = { dragon: 125, giant: 120, golem: 95, elemental: 100, eye: 95, bird: 85, humanoid: 85, undead: 85, serpent: 90, spirit: 90, plant: 75, beast: 70, insect: 60, slime: 55 };

export function Gallery() {
  const heroes: [string, HeroLook][] = [
    ...Object.values(CLASSES).map(c => [c.name, c.look] as [string, HeroLook]),
    ...Object.values(ADVANCES).map(a => [a.name, { ...CLASSES[a.classId].look, ...a.look }] as [string, HeroLook]),
  ];
  return (
    <div class="shell" style={{ paddingTop: '16px' }}>
      <h2>角色</h2>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(190px, 1fr))', gap: '8px' }}>
        {heroes.map(([n, look]) => <Cell name={n} draw={(ctx, t, a) => paintHero(ctx, look, { t, attack: a, walk: 0, cast: 0, blink: t % 4 < 0.1, hurt: 0 }, 1.2)} />)}
      </div>
      <h2 style={{ marginTop: '16px' }}>怪物</h2>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(190px, 1fr))', gap: '8px' }}>
        {MONSTERS.map(m => {
          const h = (ARCH_H[m.archetype] ?? 80) * (m.features?.includes('treant') ? 1.5 : 1);
          const s = 130 / h;
          return <Cell name={m.name} draw={(ctx, t, a) => { ctx.scale(s, s); paintMonster(ctx, m.archetype as Archetype, m.palette, m.features, { t, attack: a, cast: 0, seed: 1 }); }} />;
        })}
      </div>
      <h2 style={{ marginTop: '16px' }}>寵物</h2>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(190px, 1fr))', gap: '8px' }}>
        {PETS.map(p => <Cell name={p.name} draw={(ctx, t, a) => { ctx.scale(1.6, 1.6); paintMonster(ctx, p.archetype, p.palette, p.features, { t, attack: a, cast: 0, seed: 1 }); }} />)}
      </div>
    </div>
  );
}
