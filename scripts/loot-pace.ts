/** 診斷：掉寶節奏——每個時段換上更好裝備的次數、傳說與套裝掉落數 */
import { Game } from '@/core/game';
import { newGameState } from '@/core/state';
import type { AdvId, ClassId } from '@/core/types';
import { advancesOf } from '@/data/classes';
import { TALENT_TREES } from '@/data/talents';
import { upgradeDelta } from '@/systems/hero';
import { canEquip } from '@/systems/items';
import { equipItem } from '@/systems/forge';
import { advance, canTalent, talentUp } from '@/systems/progression';
import { buyPotion } from '@/systems/shop';
import { claimQuest, currentQuest, questDone } from '@/systems/quests';

const cls = (process.argv[2] ?? 'warrior') as ClassId;
const hours = Number(process.argv[3] ?? 168);
let clock = Date.now();
const g = new Game(newGameState('t', cls, clock, 99), { headless: true, now: () => clock });
g.ev.muted = false;
let legend = 0, sets = 0, upgrades = 0, bigUp = 0;
g.ev.on('loot:item', e => { if (e.item.rarity >= 4) legend++; if (e.item.set) sets++; });
const buckets: [number, string][] = [[1, '0-1h'], [3, '1-3h'], [6, '3-6h'], [12, '6-12h'], [24, '12-24h'], [48, '1-2天'], [96, '2-4天'], [168, '4-7天']];
let bi = 0, bucketStart = 0;
const out: string[] = [];
for (let m = 1; m <= hours * 60; m++) {
  for (let i = 0; i < 6; i++) { g.advance(10_000); clock += 10_000; }
  const s = g.state;
  for (let i = 0; i < 3; i++) { const q = currentQuest(g); if (q && questDone(g, q)) claimQuest(g); }
  for (const it of [...s.inventory]) {
    if (!canEquip(it, s.hero.classId, s.hero.level)) continue;
    const d = upgradeDelta(s, it);
    if (d.delta > 0) {
      const cur = s.equipment[d.slot];
      upgrades++;
      if (!cur || d.delta / Math.max(1, cur ? 1 : 1) > 0) {
        // 「明顯升級」：戰力提升 2% 以上
        const base = (globalThis as { __p?: number }).__p;
        void base;
      }
      equipItem(g, it.uid, d.slot);
    }
  }
  if (s.hero.level >= 30 && !s.hero.advId) advance(g, advancesOf(s.hero.classId)[0].id as AdvId);
  for (const n of TALENT_TREES[s.hero.classId].nodes) while (canTalent(s, n.id) === null) talentUp(g, n.id);
  const tier = s.hero.level < 20 ? 0 : s.hero.level < 50 ? 1 : 2;
  if (s.potions[tier] < 15 && s.cur.gold > 5000 * (tier + 1)) buyPotion(g, tier as 0, 10);
  const h = m / 60;
  if (bi < buckets.length && h >= buckets[bi][0]) {
    const span = buckets[bi][0] - bucketStart;
    out.push(`${buckets[bi][1].padEnd(7)} 升級 ${(upgrades / span).toFixed(2)}/小時  傳說 ${legend}  套裝 ${sets}  Lv${s.hero.level} 關${s.progress.best[0]}`);
    upgrades = 0; legend = 0; sets = 0; bucketStart = buckets[bi][0]; bi++;
  }
}
void bigUp;
console.log(`=== ${cls}`); console.log(out.join('\n'));
