/**
 * 戰力準不準：讀取 balance-sim --snap 存下的狀態，隨機產生候選裝備，
 * 比較「戰力變化」與「實際戰鬥表現變化」是否同方向。
 * 實際表現有兩項：
 *   掛機：在「最遠已通關的關卡 + 3」掛機 N 分鐘的擊殺數（比較吃力，死亡會損失時間，生存也有影響）
 *   首領：同區首領戰前 25 秒打掉的血量比例（打贏再加上剩餘秒數），避免大家都很快打贏而分不出差別
 * 用法：npx vite-node scripts/power-truth.ts <目錄> [每部位件數=20] [分鐘=20] [區域=3,5,7]
 */
import { readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { Game } from '@/core/game';
import type { GameState, Item, ItemSlotKind, Rarity, SlotId } from '@/core/types';
import { generateItem } from '@/systems/items';
import { heroStats, powerParts, combatPower } from '@/systems/hero';
import { Rng } from '@/core/rng';

const dir = process.argv[2];
const PER = Number(process.argv[3] ?? 20);
const MIN = Number(process.argv[4] ?? 20);
const ZONES = (process.argv.filter(x => !x.startsWith('--'))[5] ?? '3,5,7').split(',').map(Number);
const SLOTS: [ItemSlotKind, SlotId][] = [['weapon', 'weapon'], ['armor', 'armor'], ['helmet', 'helmet'], ['ring', 'ring1'], ['amulet', 'amulet'], ['boots', 'boots']];
const SEEDS = [11, 23];
/** --dump=檔案：輸出每件候選裝備的原始數據（輸出、生存、實際表現），給公式比較用 */
const DUMP = (() => { const a = process.argv.find(x => x.startsWith('--dump=')); return a ? a.slice(7) : undefined; })();
const dump: unknown[] = [];

const clone = (s: GameState): GameState => JSON.parse(JSON.stringify(s));

function farm(base: GameState, seed: number) {
  const st = clone(base);
  st.progress.difficulty = 0;
  st.progress.stage = Math.min(79, Math.max(0, st.progress.best[0]) + 3);
  st.progress.mode = 'farm';
  st.seed = seed;
  let clock = 1e12;
  const g = new Game(st, { headless: true, now: () => clock });
  const k0 = st.counters.kills ?? 0, d0 = st.counters.deaths ?? 0;
  for (let t = 0; t < MIN * 6; t++) { g.advance(10_000); clock += 10_000; }
  return { kills: (g.state.counters.kills ?? 0) - k0, deaths: (g.state.counters.deaths ?? 0) - d0 };
}

/** 首領戰分數：25 秒內打贏 = 100 + 剩餘秒數，沒打贏 = 打掉的血量百分比 */
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
    if (g.state.progress.best[0] >= bossStage) return 100 + (25 - t);
    if (g.state.progress.stage < bossStage) break;
  }
  return (1 - bossHp) * 100;
}

function measure(st: GameState, zone: number) {
  let kills = 0, deaths = 0, b = 0;
  for (const sd of SEEDS) { const f = farm(st, sd); kills += f.kills; deaths += f.deaths; }
  for (let i = 0; i < 4; i++) b += boss(st, zone, 500 + i);
  return { kills: kills / SEEDS.length, deaths: deaths / SEEDS.length, boss: b / 4 };
}

/** Spearman 等級相關 */
function spearman(a: number[], b: number[]) {
  const rank = (v: number[]) => { const idx = v.map((x, i) => [x, i] as const).sort((p, q) => p[0] - q[0]); const r = new Array(v.length); idx.forEach(([, i], k) => (r[i] = k)); return r as number[]; };
  const ra = rank(a), rb = rank(b), n = a.length;
  const ma = ra.reduce((x, y) => x + y, 0) / n, mb = rb.reduce((x, y) => x + y, 0) / n;
  let num = 0, da = 0, db = 0;
  for (let i = 0; i < n; i++) { num += (ra[i] - ma) * (rb[i] - mb); da += (ra[i] - ma) ** 2; db += (rb[i] - mb) ** 2; }
  return num / Math.sqrt(da * db);
}

const files = readdirSync(dir).filter(f => f.endsWith('.json') && ZONES.some(z => f.endsWith(`_z${z}.json`))).sort();
const all = { dp: [] as number[], dk: [] as number[], db: [] as number[], off: [] as number[], ehp: [] as number[] };
let misleading = 0, upCount = 0;
for (const f of files) {
  const base: GameState = JSON.parse(readFileSync(`${dir}/${f}`, 'utf8'));
  const zone = Number(f.match(/_z(\d)/)![1]) - 1;
  const p0 = combatPower(base, heroStats(base));
  const parts0 = powerParts(base, heroStats(base));
  const m0 = measure(base, zone);
  const m0b = (() => { const st = clone(base); st.seed = 999; return farm(st, 77); })();
  const noise = Math.abs(m0b.kills - m0.kills) / Math.max(1, m0.kills);
  const rng = new Rng(zone * 1000 + base.hero.level);
  const rows: { dp: number; dk: number; db: number; off: number; ehp: number; slot: string; name: string }[] = [];
  for (const [kind, slot] of SLOTS) {
    for (let i = 0; i < PER; i++) {
      const it: Item = generateItem({ rng, nextUid: () => 9e6 + i, classId: base.hero.classId }, { ilvl: base.hero.level + rng.int(-2, 3), rarity: rng.int(1, 4) as Rarity, slot: kind });
      const st = clone(base);
      if (st.equipment[slot]) st.inventory.push(st.equipment[slot]!);
      st.equipment[slot] = it;
      const p1 = combatPower(st, heroStats(st));
      const parts = powerParts(st, heroStats(st));
      const m = measure(st, zone);
      dump.push({ file: f, level: base.hero.level, cls: base.hero.classId, slot, off0: parts0.offense, ehp0: parts0.ehp, off1: parts.offense, ehp1: parts.ehp, k0: m0.kills, k1: m.kills, d0: m0.deaths, d1: m.deaths, b0: m0.boss, b1: m.boss, noise });
      rows.push({
        dp: (p1 - p0) / p0, dk: (m.kills - m0.kills) / Math.max(1, m0.kills), db: m.boss - m0.boss,
        off: parts.offense / parts0.offense - 1, ehp: parts.ehp / parts0.ehp - 1, slot, name: it.name,
      });
    }
  }
  const dp = rows.map(r => r.dp), dk = rows.map(r => r.dk), db = rows.map(r => r.db);
  // 戰力上升超過 3%，掛機擊殺卻掉超過雜訊、首領分數也沒變好
  const ups = rows.filter(r => r.dp > 0.03);
  const bad = ups.filter(r => r.dk < -Math.max(0.03, noise * 1.5) && r.db <= 0);
  misleading += bad.length; upCount += ups.length;
  for (const r of rows) { all.dp.push(r.dp); all.dk.push(r.dk); all.db.push(r.db); all.off.push(r.off); all.ehp.push(r.ehp); }
  console.log(`${f.padEnd(18)} Lv${base.hero.level} 戰力${p0}  擊殺/${MIN}分 ${Math.round(m0.kills)} 死${m0.deaths.toFixed(1)} 首領${m0.boss.toFixed(0)} 雜訊${(noise * 100).toFixed(1)}%`
    + `  相關：戰力↔擊殺 ${spearman(dp, dk).toFixed(2)}  戰力↔首領 ${spearman(dp, db).toFixed(2)}  輸出↔擊殺 ${spearman(rows.map(r => r.off), dk).toFixed(2)}  生存↔擊殺 ${spearman(rows.map(r => r.ehp), dk).toFixed(2)}`
    + `  戰力升但變弱 ${bad.length}/${ups.length}`);
}
const geo = all.off.map((o, i) => Math.log(1 + o) + Math.log(1 + all.ehp[i]));
console.log(`\n全部：戰力↔擊殺 ${spearman(all.dp, all.dk).toFixed(2)}  戰力↔首領 ${spearman(all.dp, all.db).toFixed(2)}`);
console.log(`替代算法：只看輸出↔擊殺 ${spearman(all.off, all.dk).toFixed(2)} ↔首領 ${spearman(all.off, all.db).toFixed(2)}｜輸出×生存（幾何）↔擊殺 ${spearman(geo, all.dk).toFixed(2)} ↔首領 ${spearman(geo, all.db).toFixed(2)}`);
console.log(`戰力上升超過 3% 的裝備中，實際變弱的比例：${misleading}/${upCount}（${(misleading / Math.max(1, upCount) * 100).toFixed(0)}%）`);
if (DUMP) writeFileSync(DUMP, JSON.stringify(dump));
