/** 診斷：同部位、同物品等級的不同稀有度裝備，戰力提升的分布 */
import { Game } from '@/core/game';
import { newGameState } from '@/core/state';
import type { ClassId, ItemSlotKind, Rarity } from '@/core/types';
import { generateItem } from '@/systems/items';
import { upgradeDelta } from '@/systems/hero';
import { AFFIX_MAP } from '@/data/items';

const cls = (process.argv[2] ?? 'warrior') as ClassId;
const g = new Game(newGameState('t', cls, Date.now(), 7), { headless: true, now: () => Date.now() });
const s = g.state;
s.hero.level = 40;
const ctx = { rng: g.rng, nextUid: g.nextUid, classId: cls };
const zeroAff = new Map<string, number>();
for (const slot of ['weapon', 'armor', 'ring', 'amulet', 'boots'] as ItemSlotKind[]) {
  // 先穿一件同部位的稀有裝當基準
  const res: Record<number, number[]> = { 1: [], 2: [], 3: [] };
  for (let i = 0; i < 400; i++) {
    for (const r of [1, 2, 3] as Rarity[]) {
      const it = generateItem(ctx, { ilvl: 40, rarity: r, slot });
      it.sockets = undefined;
      const d = upgradeDelta(s, it).delta;
      res[r].push(d);
      if (r === 3) for (const a of it.affixes) {
        const solo = { ...it, affixes: [a], implicit: [] };
        if (Math.abs(upgradeDelta(s, solo).delta - upgradeDelta(s, { ...it, affixes: [], implicit: [] }).delta) < 1) zeroAff.set(a.id, (zeroAff.get(a.id) ?? 0) + 1);
      }
    }
  }
  const avg = (a: number[]) => Math.round(a.reduce((x, y) => x + y, 0) / a.length);
  let worse = 0;
  for (let i = 0; i < 400; i++) if (res[3][i] < res[1][i]) worse++;
  console.log(slot.padEnd(7), '綠', avg(res[1]), '藍', avg(res[2]), '紫', avg(res[3]), `紫<綠 ${(worse / 4).toFixed(0)}%`);
}
console.log('對戰力沒有貢獻的詞綴：', [...zeroAff.entries()].sort((a, b) => b[1] - a[1]).map(([id, n]) => `${AFFIX_MAP.get(id)?.stat ?? id}(${n})`).join(' '));
