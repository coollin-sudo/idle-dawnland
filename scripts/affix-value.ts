/** 診斷：每種詞綴（中間值、物品等級 40）對戰力的平均貢獻，用來校正詞綴「價格」 */
import { Game } from '@/core/game';
import { newGameState } from '@/core/state';
import type { ClassId, Item, SlotId } from '@/core/types';
import { AFFIXES } from '@/data/items';
import { affixRange, UTILITY_STATS } from '@/systems/items';
import { powerWith } from '@/systems/hero';

const ILVL = 40;
const rows = new Map<string, number[]>();
for (const cls of ['warrior', 'ranger', 'mage', 'cleric'] as ClassId[]) {
  const g = new Game(newGameState('t', cls, Date.now(), 3), { headless: true, now: () => Date.now() });
  const s = g.state;
  s.hero.level = 40;
  const base = powerWith(s);
  for (const def of AFFIXES) {
    if (UTILITY_STATS.includes(def.stat)) continue;
    const [lo, hi] = affixRange(def, ILVL);
    const probe: Item = { uid: -1, slot: 'ring', base: 'ring', name: 'p', rarity: 3, ilvl: ILVL, implicit: [], affixes: [{ id: def.id, value: (lo + hi) / 2, q: 0.5 }], enh: 0 };
    // 加在空的第二個戒指位上，量這條詞綴單獨的貢獻
    const slot: SlotId = 'ring2';
    const saved = s.equipment[slot];
    s.equipment[slot] = null;
    const b0 = powerWith(s);
    const d = powerWith(s, { [slot]: probe }) - b0;
    s.equipment[slot] = saved;
    void base;
    const list = rows.get(def.id) ?? [];
    list.push(d);
    rows.set(def.id, list);
  }
}
const out = [...rows.entries()].map(([id, l]) => [id, l.reduce((a, b) => a + b, 0) / l.length, Math.max(...l)] as const).sort((a, b) => b[1] - a[1]);
const med = out[Math.floor(out.length / 2)][1];
console.log('中位數', med.toFixed(0));
for (const [id, avg, max] of out) console.log(id.padEnd(14), avg.toFixed(0).padStart(6), (avg / med).toFixed(2).padStart(6), ' max', max.toFixed(0));
