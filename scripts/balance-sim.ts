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
import { canRebirth, rebirth, resonancePct, soulsPreview, starUpgrade } from '@/systems/rebirth';
import { STAR_NODES, starCost } from '@/data/meta';
import { travel } from '@/systems/activities';
import { regionOfStage } from '@/data/regions';
import { dungeonEntries, startDungeon, startTower } from '@/systems/activities';

const hours = Number(process.argv[2] ?? 48);
const only = (process.argv[3] ?? 'all') as ClassId | 'all';
const classes: ClassId[] = only === 'all' ? ['warrior', 'ranger', 'mage', 'cleric'] : [only];
const REBIRTH = process.argv.includes('--rebirth') || process.argv.includes('--long');
/** --long：模擬長期玩家（卡關就轉生、花星魂、打通後換更高難度） */
const LONG = process.argv.includes('--long');
const STALL_H = 6;

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
  // 每日副本與無盡之塔（只在主線時）
  if (g.activity.kind === 'stage') {
    for (const d of ['xp', 'gold', 'stones']) if (Math.max(...s.progress.best) >= 19 && dungeonEntries(g, d) > 0) { startDungeon(g, d); return; }
    if (Math.max(...s.progress.best) >= 29 && (s.counters.towerTries ?? 0) < Math.floor(g.state.playMs / 3_600_000) * 2) { startTower(g); return; }
  }
  // 長期：打通普通後換更高難度
  if (LONG && g.activity.kind === 'stage') {
    const p = s.progress;
    if (p.unlockedDifficulty > p.difficulty && p.best[p.difficulty] >= 79) travel(g, Math.max(0, p.best[p.difficulty + 1]), p.difficulty + 1);
  }
  // 星魂：便宜的先買
  if (LONG) {
    for (let k = 0; k < 50; k++) {
      const opts = STAR_NODES.filter(n => (s.rebirth.ranks[n.id] ?? 0) < n.max).map(n => ({ n, c: starCost(n, s.rebirth.ranks[n.id] ?? 0) })).filter(o => o.c <= s.cur.starSouls).sort((a, b) => a.c - b.c);
      if (!opts.length) break;
      starUpgrade(g, opts[0].n.id);
    }
  }
  // 天賦已在上面處理；寵物蛋
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
  const marks = new Set(LONG ? [24, 48, 72, 120, 168, 240, 336, 504, 720] : [0.5, 1, 2, 3, 6, 12, 24, 36, 48, 72, 96, 120, 168]);
  let lastBestSum = -99, lastImprove = 0;
  const rebirthLog: string[] = [];
  for (let min = 1; min <= hours * 60; min++) {
    for (let i = 0; i < 6; i++) { g.advance(10_000); clock += 10_000; }
    manage(g);
    const bestSum = g.state.progress.best.reduce((a, b) => a + Math.max(0, b + 1), 0) * 1000 + g.state.progress.best[0];
    if (bestSum > lastBestSum) { lastBestSum = bestSum; lastImprove = min; }
    if (LONG) {
      const earned = g.state.rebirth.soulsEarned ?? 0;
      const worth = (100 + resonancePct(earned + soulsPreview(g))) / (100 + resonancePct(earned)) >= 1.25;
      if (canRebirth(g) && worth && min - lastImprove > STALL_H * 60 && g.activity.kind === 'stage') {
        const souls = soulsPreview(g);
        rebirthLog.push(`${(min / 60).toFixed(0)}h 轉生#${g.state.rebirth.count + 1}（Lv${g.state.hero.level} 最佳${g.state.progress.best.join('/')} 星魂+${souls}）`);
        rebirth(g);
        lastBestSum = -99; lastImprove = min;
      }
    } else if (REBIRTH && canRebirth(g) && g.state.progress.mode === 'farm' && g.state.rebirth.count < 3 && min % 60 === 0) rebirth(g);
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
        `塔${s.tower.best}`,
        `寵${Object.keys(s.pets.owned).length}`,
        `裝${SLOTS.map(sl => s.equipment[sl] ? `${s.equipment[sl]!.rarity}+${s.equipment[sl]!.enh}` : '-').join(',')}`,
      ].join(' '));
    }
  }
  console.log(`\n=== ${cls}（${((performance.now() - t0) / 1000).toFixed(1)}s）===`);
  console.log(rows.join('\n'));
  if (rebirthLog.length) console.log('  ' + rebirthLog.join('\n  '));
}
