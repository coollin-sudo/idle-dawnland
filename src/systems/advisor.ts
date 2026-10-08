import type { Game } from '@/core/game';
import { TITLES } from '@/data/titles';
import { ADVANCE_LEVEL } from '@/core/formulas';
import { UNLOCKS } from '@/data/quests';
import { canEquip } from './items';
import { upgradeDelta } from './hero';
import { invCapacity } from './loot';
import { talentAvailable } from './progression';
import { dungeonEntries } from './activities';
import { canRebirth, resonancePct, soulsPreview } from './rebirth';
import { hatchingCount } from './pets';
import { DUNGEONS } from '@/data/dungeons';

export interface Advice {
  id: string;
  icon: string;
  text: string;
  tab: string;
}

/** 依目前狀態給玩家「下一步可以做什麼」的建議（重要的在前） */
export function advise(g: Game): Advice[] {
  const s = g.state;
  const out: Advice[] = [];
  const best = Math.max(...s.progress.best);
  if (s.hero.level >= ADVANCE_LEVEL && !s.hero.advId) out.push({ id: 'adv', icon: '🌟', text: '可以轉職了！', tab: 'hero' });
  const better = s.inventory.filter(it => canEquip(it, s.hero.classId, s.hero.level) && upgradeDelta(s, it).delta > 0);
  if (better.length) out.push({ id: 'equip', icon: '🎒', text: `背包有 ${better.length} 件更好的裝備`, tab: 'bag' });
  if (!s.hero.autoAlloc && s.hero.statPoints > 0) out.push({ id: 'stat', icon: '💪', text: `${s.hero.statPoints} 點屬性未分配`, tab: 'hero' });
  if (s.hero.skillPoints > 0) out.push({ id: 'skill', icon: '✨', text: `${s.hero.skillPoints} 點技能點未使用`, tab: 'skills' });
  const tp = talentAvailable(s);
  if (tp > 0) out.push({ id: 'talent', icon: '🌳', text: `${tp} 點天賦未使用`, tab: 'talents' });
  const ready = s.pets.eggs.filter(e => e.readyAt !== null && e.readyAt <= g.now()).length;
  if (ready) out.push({ id: 'egg', icon: '🐣', text: `${ready} 顆寵物蛋可以破殼`, tab: 'pets' });
  else if (s.pets.eggs.some(e => e.readyAt === null) && hatchingCount(g) < s.pets.slots) out.push({ id: 'hatch', icon: '🥚', text: '有寵物蛋可以開始孵化', tab: 'pets' });
  if (best >= UNLOCKS.dungeon && g.activity.kind === 'stage') {
    const left = DUNGEONS.reduce((a, d) => a + dungeonEntries(g, d.id), 0);
    if (left > 0) out.push({ id: 'dungeon', icon: '🏛️', text: `今天還有 ${left} 次副本`, tab: 'challenge' });
  }
  if (s.inventory.length >= invCapacity(g) - 5) out.push({ id: 'bag', icon: '📦', text: '背包快滿了，記得分解', tab: 'bag' });
  if (canRebirth(g)) {
    // 轉生後共鳴加成能提升 25% 以上才建議（避免無效轉生）
    const earned = s.rebirth.soulsEarned ?? 0;
    const gain = (100 + resonancePct(earned + soulsPreview(g))) / (100 + resonancePct(earned));
    if (gain >= 1.25 && s.hero.level >= 50) out.push({ id: 'rebirth', icon: '🌌', text: `轉生可讓星魂共鳴 ×${gain.toFixed(1)}`, tab: 'rebirth' });
  }
  if (s.cur.stones >= 20 && s.equipment.weapon && s.equipment.weapon.enh < 5) out.push({ id: 'enh', icon: '🔨', text: '強化石很多，去強化武器吧', tab: 'forge' });
  const emptySockets = Object.values(s.equipment).some(it => it?.sockets?.includes(null));
  if (emptySockets && Object.values(s.jewels).some(n => n > 0)) out.push({ id: 'jewel', icon: '💠', text: '有魔晶可以鑲嵌', tab: 'forge' });
  if (!s.title && TITLES.some(t => t.unlocked(s))) out.push({ id: 'title', icon: '👑', text: '有稱號可以配戴', tab: 'collection' });
  return out;
}
