/**
 * 首領試打：讀取 balance-sim --snap 存下的「剛到達首領」狀態，比較不同打法的勝率。
 * 用法：npx vite-node scripts/boss-trial.ts <目錄> [次數=20] [區域=all]
 *   naive：照自動配點的技能欄直接打
 *   smart：依首領機制調整技能欄（scripts/lib/smart.ts）
 *   nomech：拿掉首領機制（參考：機制的影響有多大）
 */
import { readdirSync, readFileSync } from 'node:fs';
import { Game } from '@/core/game';
import type { GameState } from '@/core/types';
import { smartSetup } from './lib/smart';

const dir = process.argv[2];
const N = Number(process.argv[3] ?? 20);
const onlyZone = process.argv[4];
const files = readdirSync(dir).filter(f => f.endsWith('.json') && (!onlyZone || f.endsWith(`_z${onlyZone}.json`))).sort();

function trial(base: GameState, zone: number, mode: 'naive' | 'smart' | 'nomech', seed: number) {
  const st: GameState = JSON.parse(JSON.stringify(base));
  const bossStage = zone * 10 + 9;
  st.progress.best[0] = Math.min(st.progress.best[0], bossStage - 1);
  st.progress.difficulty = 0;
  st.progress.stage = bossStage;
  st.progress.mode = 'push';
  st.hero.hp = 0;
  st.seed = seed;
  let clock = 1e12;
  const g = new Game(st, { headless: true, now: () => clock });
  if (mode === 'smart') smartSetup(g);
  const act = g.activity as unknown as { wave: number; spawnWave(): void };
  for (const u of g.battle.units) if (u.side === 'enemy') u.alive = false;
  g.battle.sweep();
  act.wave = 4;
  act.spawnWave();
  if (mode === 'nomech') for (const u of g.battle.units) u.mech = undefined;
  let bossHp = 1, dead = false;
  for (let t = 0; t < 90; t++) {
    const boss = g.battle.units.find(u => u.boss);
    if (boss) bossHp = boss.hp / boss.stats.hp;
    if (g.battle.hero && !g.battle.hero.alive) dead = true;
    g.advance(1000); clock += 1000;
    if (g.state.progress.best[0] >= bossStage) return { win: true, t, bossHp: 0, dead };
    if (g.state.progress.stage < bossStage) return { win: false, t, bossHp, dead };
  }
  return { win: false, t: 90, bossHp, dead };
}

for (const f of files) {
  const base: GameState = JSON.parse(readFileSync(`${dir}/${f}`, 'utf8'));
  const zone = Number(f.match(/_z(\d)/)![1]) - 1;
  const out: string[] = [];
  for (const mode of ['naive', 'smart', 'nomech'] as const) {
    let w = 0, tt = 0, left = 0, deaths = 0;
    for (let i = 0; i < N; i++) {
      const r = trial(base, zone, mode, 1000 + i);
      if (r.win) { w++; tt += r.t; } else { left += r.bossHp; if (r.dead) deaths++; }
    }
    const fails = N - w;
    out.push(`${mode} ${String(Math.round(w / N * 100)).padStart(3)}%${w ? ` ${Math.round(tt / w)}s` : ''}${fails ? `(剩${Math.round(left / fails * 100)}%${deaths ? ` 死${deaths}` : ''})` : ''}`.padEnd(24));
  }
  console.log(`${f.padEnd(18)} Lv${base.hero.level} ${base.hero.advId ?? ''}`.padEnd(36) + out.join('｜'));
}
