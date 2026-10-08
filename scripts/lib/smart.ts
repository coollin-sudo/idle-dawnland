import type { Game } from '@/core/game';
import { BOSS_MECHS } from '@/data/bossMechanics';
import { getMonster } from '@/data/monsters';
import { REGIONS } from '@/data/regions';
import { SPEC_RANK } from '@/data/skillSpecs';
import { getSkill } from '@/data/skills';
import { autoSkills, canTalent, learnSkill, loadoutSlots, RESET_SKILLS_GOLD, RESET_TALENT_GOLD, resetSkills, resetTalents, setLoadout, setSkillSpec, talentUp, toggleHold } from '@/systems/progression';
import { TALENT_TREES } from '@/data/talents';

type SmartGame = Game & { _smart?: string; _prefTalents?: string[] };

/** 天賦分配：優先點機制需要的天賦，其餘照順序點 */
export function allocTalents(g: Game) {
  const s = g.state;
  const nodes = TALENT_TREES[s.hero.classId].nodes;
  const pref = (g as SmartGame)._prefTalents ?? [];
  for (const id of pref) {
    let guard = 60;
    while (guard-- > 0) {
      const why = canTalent(s, id);
      if (why === null) { talentUp(g, id); continue; }
      if (!why.startsWith('需要先投入')) break;
      // 點數不夠解鎖這一層：先照順序點低層
      const tier = nodes.find(n => n.id === id)!.tier;
      const filler = nodes.find(n => n.tier < tier && !pref.includes(n.id) && canTalent(s, n.id) === null);
      if (!filler) break;
      talentUp(g, filler.id);
    }
  }
  for (const node of nodes) while (canTalent(s, node.id) === null) talentUp(g, node.id);
}

/** 依目前區域首領的機制，套用第一個可行的解法 */
export function smartSetup(g: Game) {
  const s = g.state;
  const h = s.hero;
  const p = s.progress;
  const region = REGIONS[Math.floor((p.best[p.difficulty] + 1) / 10)];
  if (!region) return;
  const mech = getMonster(region.boss).mech;
  const key = `${p.difficulty}:${region.id}:${h.level}`;
  const sg = g as SmartGame;
  if (!mech || sg._smart === key) return;
  sg._smart = key;
  const has = (id: string) => (h.skillRanks[id] ?? 0) > 0 && h.level >= getSkill(id).unlock && (!getSkill(id).advId || getSkill(id).advId === h.advId);
  const slots = loadoutSlots(h.level);
  for (const c of BOSS_MECHS[mech].counters[h.classId]) {
    if (c.adv && c.adv !== h.advId) continue;
    const ids = c.req.filter(r => r.kind !== 'talent').map(r => (r as { id: string }).id);
    if (!ids.every(has)) continue;
    // 專精需要 5 級：不夠就重置技能點，先把這個技能點到 5 級
    const short = c.req.filter(r => r.kind === 'spec' && (h.skillRanks[r.id] ?? 0) < SPEC_RANK).map(r => (r as { id: string }).id);
    if (short.length) {
      let total = 0;
      for (const k in h.skillRanks) total += h.skillRanks[k];
      total += h.skillPoints;
      if (total < 1 + short.length * (SPEC_RANK - 1) + 1 || s.cur.gold < RESET_SKILLS_GOLD(h.level)) continue;
      resetSkills(g);
      for (const id of short) while ((h.skillRanks[id] ?? 0) < SPEC_RANK && h.skillPoints > 0) learnSkill(g, id);
      autoSkills(s);
    }
    // 天賦：沒點到的話重置天賦並優先點
    const talents = c.req.filter(r => r.kind === 'talent').map(r => (r as { id: string }).id);
    sg._prefTalents = talents;
    if (talents.some(id => !(h.talentRanks[id] > 0)) && s.cur.gold >= RESET_TALENT_GOLD(h.level)) { resetTalents(g); allocTalents(g); }
    for (const r of c.req) {
      if (r.kind === 'spec') setSkillSpec(g, r.id, r.spec);
      if (r.kind === 'first') { setLoadout(g, 0, r.id); }
      if ((r.kind === 'skill' || r.kind === 'hold' || r.kind === 'spec') && !h.loadout.includes(r.id)) setLoadout(g, slots - 1, r.id);
      if (r.kind === 'hold') { const i = h.loadout.indexOf(r.id); if (i >= 0 && !h.loadoutHold[i]) toggleHold(g, i); }
    }
    for (let i = 0; i < h.loadout.length; i++) {
      const want = c.req.some(r => r.kind === 'hold' && r.id === h.loadout[i]);
      if (h.loadoutHold[i] !== want && h.loadout[i]) toggleHold(g, i);
    }
    return;
  }
}

