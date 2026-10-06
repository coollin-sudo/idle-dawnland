import type { Game } from '@/core/game';
import { todayKey } from '@/core/format';
import { SLOTS } from '@/data/items';
import { ACHIEVEMENT_GEMS, ACHIEVEMENTS, CODEX_TIERS, DAILY_CHEST_GEMS, DAILY_COUNT, DAILY_POOL } from '@/data/meta';
import { MAIN_QUESTS, type QuestDef, type QuestReward } from '@/data/quests';
import type { Unit } from '@/core/unit';
import { codexTiers, talentSpent } from './hero';
import { generateItem } from './items';
import { addEgg, itemCtx, receiveItem } from './loot';
import { checkPetLevels } from './pets';

// ---------------------------------------------------------------------
// 主線任務
// ---------------------------------------------------------------------
export function currentQuest(g: Game): QuestDef | undefined {
  return MAIN_QUESTS[g.state.quests.main];
}

export function questProgress(g: Game, q: QuestDef): { cur: number; goal: number } {
  const s = g.state;
  const c = s.counters;
  switch (q.type) {
    case 'stage': return { cur: s.progress.best[0] + 1, goal: q.value + 1 };
    case 'diffStage': return { cur: s.progress.best[q.difficulty ?? 0] + 1, goal: q.value + 1 };
    case 'level': return { cur: s.hero.level, goal: q.value };
    case 'kill': return { cur: s.codex[q.target!] ?? 0, goal: q.value };
    case 'enhance': return { cur: c.enhanceMax ?? 0, goal: q.value };
    case 'equipRarity': {
      const best = Math.max(-1, ...SLOTS.map(sl => s.equipment[sl]?.rarity ?? -1));
      return { cur: best >= q.value ? 1 : 0, goal: 1 };
    }
    case 'skill': return { cur: Math.max(0, ...Object.values(s.hero.skillRanks)), goal: q.value };
    case 'talent': return { cur: talentSpent(s), goal: q.value };
    case 'advance': return { cur: s.hero.advId ? 1 : 0, goal: 1 };
    case 'pets': return { cur: Object.keys(s.pets.owned).length, goal: q.value };
    case 'dungeon': return { cur: c.dungeonRuns ?? 0, goal: q.value };
    case 'tower': return { cur: s.tower.best, goal: q.value };
    case 'salvage': return { cur: c.salvaged ?? 0, goal: q.value };
    case 'rebirth': return { cur: s.rebirth.count, goal: q.value };
  }
}

export function questDone(g: Game, q: QuestDef) {
  const p = questProgress(g, q);
  return p.cur >= p.goal;
}

export function grantReward(g: Game, r: QuestReward) {
  const c = g.state.cur;
  if (r.gold) c.gold += r.gold;
  if (r.gems) c.gems += r.gems;
  if (r.stones) c.stones += r.stones;
  if (r.petFood) c.petFood += r.petFood;
  if (r.protect) c.protect += r.protect;
  if (r.egg !== undefined) addEgg(g, r.egg);
  if (r.item) receiveItem(g, generateItem(itemCtx(g), { ilvl: g.state.hero.level + 2, rarity: r.item.rarity }));
}

export function describeReward(r: QuestReward): string {
  const parts: string[] = [];
  if (r.gold) parts.push(`💰${r.gold.toLocaleString()}`);
  if (r.gems) parts.push(`💠${r.gems}`);
  if (r.stones) parts.push(`🔷${r.stones}`);
  if (r.petFood) parts.push(`🍖${r.petFood}`);
  if (r.protect) parts.push(`📜${r.protect}`);
  if (r.egg !== undefined) parts.push(['🥚普通蛋', '🥚稀有蛋', '🥚傳說蛋'][r.egg]);
  if (r.item) parts.push(['普通', '優良', '稀有', '史詩', '傳說', '神話'][r.item.rarity] + '裝備');
  return parts.join('  ');
}

export function claimQuest(g: Game) {
  const q = currentQuest(g);
  if (!q || !questDone(g, q)) return;
  grantReward(g, q.reward);
  g.state.quests.main++;
  g.count('questsDone');
  g.ev.emit('quest:complete', { name: q.name });
  g.toast(`任務完成：${q.name}`, 'good', '📜');
  if (q.after) playStory(g, q.after);
  const next = currentQuest(g);
  if (next?.before) playStory(g, next.before);
  g.touch();
}

export function playStory(g: Game, id: string) {
  if (g.state.story.includes(id)) return;
  g.state.story.push(id);
  g.ev.emit('story', { id });
}

// ---------------------------------------------------------------------
// 每日任務（MissionState.progress 存的是指派當下的計數器基準值）
// ---------------------------------------------------------------------
export function refreshDailies(g: Game) {
  const s = g.state;
  const today = todayKey(g.now());
  if (s.quests.dailyDate === today) return;
  s.quests.dailyDate = today;
  s.quests.dailyChest = false;
  const picks = g.rng.shuffle(DAILY_POOL.slice()).slice(0, DAILY_COUNT);
  s.quests.daily = picks.map(d => ({ id: d.id, progress: s.counters[d.counter] ?? 0, claimed: false }));
}

export function dailyProgress(g: Game, id: string) {
  const def = DAILY_POOL.find(d => d.id === id)!;
  const m = g.state.quests.daily.find(x => x.id === id)!;
  const cur = Math.max(0, (g.state.counters[def.counter] ?? 0) - m.progress);
  return { cur: Math.min(cur, def.goal), goal: def.goal, def, m };
}

export function claimDaily(g: Game, id: string) {
  const p = dailyProgress(g, id);
  if (p.m.claimed || p.cur < p.goal) return;
  p.m.claimed = true;
  const gold = Math.round(500 * (1 + g.state.hero.level * 0.6));
  g.state.cur.gems += p.def.gems;
  g.state.cur.gold += gold;
  g.count('dailiesDone');
  g.toast(`每日任務完成：寶石 +${p.def.gems}、金幣 +${gold.toLocaleString()}`, 'good', '📅');
  g.touch();
}

export function claimDailyChest(g: Game) {
  const q = g.state.quests;
  if (q.dailyChest || !q.daily.length || !q.daily.every(d => d.claimed)) return;
  q.dailyChest = true;
  g.state.cur.gems += DAILY_CHEST_GEMS;
  g.state.cur.stones += 10;
  addEgg(g, 0);
  g.toast(`每日寶箱：寶石 +${DAILY_CHEST_GEMS}、強化石 +10、寵物蛋`, 'epic', '🎁');
  g.touch();
}

// ---------------------------------------------------------------------
// 成就與圖鑑
// ---------------------------------------------------------------------
export function codexInc(g: Game, src: Unit, tgt: Unit): number {
  if (src.side !== 'hero') return 0;
  const n = g.state.codex[tgt.defId] ?? 0;
  let tiers = 0;
  for (const t of CODEX_TIERS) if (n >= t) tiers++;
  return tiers * 2;
}

function checkAchievements(g: Game) {
  const s = g.state;
  for (const a of ACHIEVEMENTS) {
    const tier = s.achievements[a.id] ?? 0;
    if (tier >= a.tiers.length) continue;
    const v = s.counters[a.counter] ?? 0;
    if (v >= a.tiers[tier]) {
      s.achievements[a.id] = tier + 1;
      const gems = ACHIEVEMENT_GEMS[tier];
      s.cur.gems += gems;
      g.ev.emit('achievement', { name: a.name, tier: tier + 1 });
      g.toast(`成就「${a.name}」${['Ⅰ', 'Ⅱ', 'Ⅲ', 'Ⅳ', 'Ⅴ'][tier]}　寶石 +${gems}`, 'epic', a.icon);
      g.heroChanged();
    }
  }
}

/** 每秒檢查：衍生計數器、成就、每日任務換日、主線劇情 */
export function checkProgress(g: Game) {
  const s = g.state;
  s.counters.petsOwned = Object.keys(s.pets.owned).length;
  s.counters.codexTiers = codexTiers(s);
  s.counters.rebirths = s.rebirth.count;
  s.counters.maxLevel = Math.max(s.counters.maxLevel ?? 0, s.hero.level);
  checkAchievements(g);
  checkPetLevels(g);
  refreshDailies(g);
  const q = currentQuest(g);
  if (q?.before && !g.headless) playStory(g, q.before);
  // 清除過期祝福
  if (s.buffs.length && s.buffs.some(b => b.until <= g.now())) {
    s.buffs = s.buffs.filter(b => b.until > g.now());
    g.heroChanged();
  }
}
