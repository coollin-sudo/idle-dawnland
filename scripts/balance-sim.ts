/**
 * 平衡模擬器：用無畫面模式跑真實戰鬥邏輯，模擬一個「會基本操作」的玩家連續掛機。
 * 用法：npm run sim -- [小時=48] [職業=all]
 */
import { Game } from '@/core/game';
import { newGameState } from '@/core/state';
import type { AdvId, ClassId } from '@/core/types';
import { advancesOf } from '@/data/classes';
import { SLOTS } from '@/data/items';
import { TALENT_TREES } from '@/data/talents';
import { combatPower, heroStats, upgradeDelta } from '@/systems/hero';
import { canEquip } from '@/systems/items';
import { enhance, equipItem, enhanceCost, findItem } from '@/systems/forge';
import { advance, canTalent, talentUp } from '@/systems/progression';
import { buyPotion } from '@/systems/shop';
import { claimQuest, currentQuest, questDone } from '@/systems/quests';
import { claimEgg, startHatch } from '@/systems/pets';
import { canRebirth, rebirth } from '@/systems/rebirth';
import { regionOfStage } from '@/data/regions';

const hours = Number(process.argv[2] ?? 48);
const only = (process.argv[3] ?? 'all') as ClassId | 'all';
const classes: ClassId[] = only === 'all' ? ['warrior', 'ranger', 'mage', 'cleric'] : [only];
const REBIRTH = process.argv.includes('--rebirth');

function manage(g: Game) {
  const s = g.state;
  // 任務
  for (let i = 0; i < 3; i++) { const q = currentQuest(g); if (q && questDone(g, q)) claimQuest(g); }
  // 換上更好的裝備（含傳說／套裝）
  for (const it of [...s.inventory]) {
    if (!canEquip(it, s.hero.classId, s.hero.level)) continue;
    const d = upgradeDelta(s, it);
    if (d.delta > 0) equipItem(g, it.uid, d.slot);
  }
  // 轉職
  if (s.hero.level >= 30 && !s.hero.advId) advance(g, advancesOf(s.hero.classId)[0].id as AdvId);
  // 天賦：依順序點
  for (const node of TALENT_TREES[s.hero.classId].nodes) while (canTalent(s, node.id) === null) talentUp(g, node.id);
  // 藥水
  const tier = s.hero.level < 20 ? 0 : s.hero.level < 50 ? 1 : 2;
  if (s.potions[tier] < 15 && s.cur.gold > 5000 * (tier + 1)) buyPotion(g, tier as 0, 10);
  // 強化身上裝備到 +8（留一些金幣）
  for (const sl of SLOTS) {
    const it = s.equipment[sl];
    if (!it || it.enh >= 8) continue;
    const c = enhanceCost(it);
    if (s.cur.stones >= c.stones && s.cur.gold > c.gold * 2) enhance(g, it.uid, false);
  }
  // 寵物蛋
  for (const e of [...s.pets.eggs]) {
    if (e.readyAt === null) startHatch(g, e.uid);
    else if (e.readyAt <= g.now()) claimEgg(g, e.uid);
  }
  void findItem;
}

let clock = Date.now();
for (const cls of classes) {
  const state = newGameState('sim', cls, clock, 12345);
  const g = new Game(state, { headless: true, now: () => clock });
  const t0 = performance.now();
  const rows: string[] = [];
  const marks = new Set([0.5, 1, 2, 3, 6, 12, 24, 36, 48, 72, 96, 120, 168]);
  for (let min = 1; min <= hours * 60; min++) {
    for (let i = 0; i < 6; i++) { g.advance(10_000); clock += 10_000; }
    manage(g);
    if (REBIRTH && canRebirth(g) && g.state.progress.mode === 'farm' && g.state.rebirth.count < 3 && min % 60 === 0) rebirth(g);
    const h = min / 60;
    if (marks.has(h) || min === hours * 60) {
      const s = g.state;
      const st = heroStats(s);
      const r = regionOfStage(s.progress.stage);
      rows.push([
        `${String(h).padStart(5)}h`,
        `Lv${String(s.hero.level).padStart(3)}`,
        `${r.name}${Math.floor(s.progress.stage / 10) + 1}-${(s.progress.stage % 10) + 1}`.padEnd(10),
        `best ${s.progress.best.join('/')}`.padEnd(14),
        `${s.progress.mode}`,
        `死${s.counters.deaths ?? 0}`.padEnd(6),
        `戰力${combatPower(s, st)}`.padEnd(10),
        `金${Math.round(s.cur.gold)}`.padEnd(12),
        `石${s.cur.stones}`,
        `任務${s.quests.main}`,
        `轉生${s.rebirth.count}`,
        `裝${SLOTS.map(sl => s.equipment[sl] ? `${s.equipment[sl]!.rarity}+${s.equipment[sl]!.enh}` : '-').join(',')}`,
      ].join(' '));
    }
  }
  console.log(`\n=== ${cls}（${((performance.now() - t0) / 1000).toFixed(1)}s）===`);
  console.log(rows.join('\n'));
}
