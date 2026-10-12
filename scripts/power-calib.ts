/**
 * 戰力權重校正：每次只加一項屬性，比較「戰力公式預估的輸出／生存提升」與「實際戰鬥提升」。
 * 實際提升：掛機（最遠已通關 + 3 關，20 分鐘擊殺數）與首領戰（前 25 秒打掉的血量）。
 * 用法：npx vite-node scripts/power-calib.ts <snap 目錄> [區域=3,5,7]
 */
import { readdirSync, readFileSync } from 'node:fs';
import { Game } from '@/core/game';
import type { GameState } from '@/core/types';
import type { Mod, StatKey } from '@/core/stats';
import { heroStats, powerParts } from '@/systems/hero';
import { CLASSES } from '@/data/classes';

const dir = process.argv[2];
const ZONES = (process.argv[3] ?? '3,5,7').split(',').map(Number);
const SEEDS = [11, 23, 37];
const clone = (s: GameState): GameState => JSON.parse(JSON.stringify(s));

function farm(base: GameState, seed: number) {
  const st = clone(base);
  st.progress.difficulty = 0;
  st.progress.stage = Math.min(79, Math.max(0, st.progress.best[0]) + 3);
  st.progress.mode = 'farm';
  st.seed = seed;
  let clock = 1e12;
  const g = new Game(st, { headless: true, now: () => clock });
  const k0 = st.counters.kills ?? 0;
  for (let t = 0; t < 120; t++) { g.advance(10_000); clock += 10_000; }
  return (g.state.counters.kills ?? 0) - k0;
}

function boss(base: GameState, zone: number, seed: number) {
  const st = clone(base);
  const bossStage = zone * 10 + 9;
  st.progress.best[0] = Math.min(st.progress.best[0], bossStage - 1);
  st.progress.difficulty = 0;
  st.progress.stage = bossStage;
  st.progress.mode = 'push';
  st.hero.hp = 0;
  st.seed = seed;
  let clock = 1e12;
  const g = new Game(st, { headless: true, now: () => clock });
  const act = g.activity as unknown as { wave: number; spawnWave(): void };
  for (const u of g.battle.units) if (u.side === 'enemy') u.alive = false;
  g.battle.sweep();
  act.wave = 4;
  act.spawnWave();
  let bossHp = 1;
  for (let t = 0; t < 25; t++) {
    const b = g.battle.units.find(u => u.boss);
    if (b) bossHp = b.hp / b.stats.hp;
    g.advance(1000); clock += 1000;
    if (g.state.progress.best[0] >= bossStage) return 100 + (25 - t) * 4;
    if (g.state.progress.stage < bossStage) break;
  }
  return (1 - bossHp) * 100;
}

const measure = (st: GameState, zone: number) => ({
  kills: SEEDS.reduce((a, sd) => a + farm(st, sd), 0) / SEEDS.length,
  boss: [0, 1, 2, 3].reduce((a, i) => a + boss(st, zone, 500 + i), 0) / 4,
});

type Probe = { name: string; mods: (s: GameState) => Mod[] };
const f = (stat: StatKey, value: number): Mod => ({ stat, kind: 'flat', value });
const i = (stat: StatKey, value: number): Mod => ({ stat, kind: 'inc', value });
const PROBES: Probe[] = [
  { name: '攻擊 +10%', mods: s => [i(CLASSES[s.hero.classId].basic.dmgType === 'magic' ? 'matk' : 'atk', 10)] },
  { name: '暴擊率 +5', mods: () => [f('crit', 5)] },
  { name: '暴擊傷害 +25', mods: () => [f('critDmg', 25)] },
  { name: '攻速 +8', mods: () => [f('haste', 8)] },
  { name: '冷卻 +8', mods: () => [f('cdr', 8)] },
  { name: '全傷害 +10', mods: () => [f('dmg', 10)] },
  { name: '技能傷害 +10', mods: () => [f('skillDmg', 10)] },
  { name: '首領傷害 +10', mods: () => [f('bossDmg', 10)] },
  { name: '精英傷害 +10', mods: () => [f('eliteDmg', 10)] },
  { name: '持續傷害 +10', mods: () => [f('dotDmg', 10)] },
  { name: '異常觸發 +5', mods: () => [f('statusChance', 5)] },
  { name: '魔力回復 +50%', mods: () => [i('mpRegen', 50)] },
  { name: '生命 +15%', mods: () => [i('hp', 15)] },
  { name: '防禦 +30%', mods: () => [i('def', 30), i('res', 30)] },
  { name: '迴避 +30%', mods: () => [i('eva', 30)] },
  { name: '吸血 +3', mods: () => [f('lifesteal', 3)] },
];

const files = readdirSync(dir).filter(fn => fn.endsWith('.json') && ZONES.some(z => fn.endsWith(`_z${z}.json`))).sort();
const agg = new Map<string, { po: number; pe: number; ak: number; ab: number; n: number }>();
for (const fn of files) {
  const base: GameState = JSON.parse(readFileSync(`${dir}/${fn}`, 'utf8'));
  const zone = Number(fn.match(/_z(\d)/)![1]) - 1;
  const p0 = powerParts(base, heroStats(base));
  const m0 = measure(base, zone);
  const line: string[] = [];
  for (const pr of PROBES) {
    const st = clone(base);
    const w = st.equipment.weapon!;
    w.implicit = [...w.implicit, ...pr.mods(st)];
    const p = powerParts(st, heroStats(st));
    const m = measure(st, zone);
    const po = (p.offense / p0.offense - 1) * 100, pe = (p.ehp / p0.ehp - 1) * 100;
    const ak = (m.kills / Math.max(1, m0.kills) - 1) * 100, ab = m.boss - m0.boss;
    const a = agg.get(pr.name) ?? { po: 0, pe: 0, ak: 0, ab: 0, n: 0 };
    a.po += po; a.pe += pe; a.ak += ak; a.ab += ab; a.n++;
    agg.set(pr.name, a);
    line.push(`${pr.name} 預估輸出${po.toFixed(1)}% 生存${pe.toFixed(1)}% → 擊殺${ak.toFixed(1)}% 首領${ab.toFixed(1)}`);
  }
  console.log(`== ${fn} Lv${base.hero.level} 基準擊殺 ${m0.kills.toFixed(0)} 首領 ${m0.boss.toFixed(0)}`);
  for (const l of line) console.log('  ' + l);
}
console.log('\n平均（全部存檔）');
for (const [k, a] of agg) console.log(`  ${k.padEnd(10)} 預估輸出 ${(a.po / a.n).toFixed(1)}%  預估生存 ${(a.pe / a.n).toFixed(1)}%  ｜ 實際擊殺 ${(a.ak / a.n).toFixed(1)}%  實際首領 ${(a.ab / a.n).toFixed(1)}`);
