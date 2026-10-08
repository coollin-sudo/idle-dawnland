/** 診斷：金幣與強化石的收支——每小時收入 vs 把全身裝備強化到 +20 的期望花費 */
import { Game } from '@/core/game';
import { newGameState } from '@/core/state';
import type { AdvId, ClassId, Item } from '@/core/types';
import { advancesOf } from '@/data/classes';
import { SLOTS } from '@/data/items';
import { TALENT_TREES } from '@/data/talents';
import { upgradeDelta } from '@/systems/hero';
import { canEquip } from '@/systems/items';
import { enhanceCost, equipItem, ENH_RATES, MAX_ENH, ENH_DOWN_FROM, ENH_BREAK_FROM } from '@/systems/forge';
import { advance, canTalent, talentUp } from '@/systems/progression';
import { buyPotion } from '@/systems/shop';
import { claimQuest, currentQuest, questDone } from '@/systems/quests';

/** 用保護卷軸（不碎、不掉級）時，從 +e 強化到 +20 的期望金幣與強化石 */
function expectedEnhance(it: Item) {
  let gold = 0, stones = 0;
  for (let e = it.enh; e < MAX_ENH; e++) {
    const p = ENH_RATES[e] / 100;
    const c = enhanceCost({ ...it, enh: e });
    // 期望嘗試次數 1/p（失敗時保護卷軸防止掉級，近似為重試）
    gold += c.gold / p; stones += c.stones / p;
  }
  return { gold, stones };
}

const cls = (process.argv[2] ?? 'warrior') as ClassId;
let clock = Date.now();
const g = new Game(newGameState('t', cls, clock, 5), { headless: true, now: () => clock });
const marks = [1, 6, 24, 72, 168];
let prevGold = 0, prevStone = 0, prevH = 0;
void ENH_DOWN_FROM; void ENH_BREAK_FROM;
for (let m = 1; m <= 168 * 60; m++) {
  for (let i = 0; i < 6; i++) { g.advance(10_000); clock += 10_000; }
  const s = g.state;
  for (let i = 0; i < 3; i++) { const q = currentQuest(g); if (q && questDone(g, q)) claimQuest(g); }
  for (const it of [...s.inventory]) { if (!canEquip(it, s.hero.classId, s.hero.level)) continue; const d = upgradeDelta(s, it); if (d.delta > 0) equipItem(g, it.uid, d.slot); }
  if (s.hero.level >= 30 && !s.hero.advId) advance(g, advancesOf(s.hero.classId)[0].id as AdvId);
  for (const n of TALENT_TREES[s.hero.classId].nodes) while (canTalent(s, n.id) === null) talentUp(g, n.id);
  const tier = s.hero.level < 20 ? 0 : s.hero.level < 50 ? 1 : 2;
  if (s.potions[tier] < 15 && s.cur.gold > 5000 * (tier + 1)) buyPotion(g, tier as 0, 10);
  const h = m / 60;
  if (marks.includes(h)) {
    const earned = s.counters.goldEarned ?? 0;
    const stonesNow = s.cur.stones;
    const full = SLOTS.map(sl => s.equipment[sl]).filter((x): x is Item => !!x).map(it => expectedEnhance({ ...it, enh: 0 }));
    const fullGold = full.reduce((a, b) => a + b.gold, 0), fullStone = full.reduce((a, b) => a + b.stones, 0);
    const gph = (earned - prevGold) / (h - prevH);
    console.log(`${String(h).padStart(4)}h Lv${s.hero.level} 金幣收入 ${Math.round(gph).toLocaleString()}/小時  強化石 ${Math.round((stonesNow - prevStone) / (h - prevH))}/小時（持有）  全身 +0→+20 期望：金幣 ${Math.round(fullGold).toLocaleString()}（=${(fullGold / gph).toFixed(1)} 小時收入）、強化石 ${Math.round(fullStone)}`);
    prevGold = earned; prevStone = stonesNow; prevH = h;
  }
}
