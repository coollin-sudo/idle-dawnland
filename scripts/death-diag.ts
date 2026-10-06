/** 診斷：掛機時英雄都死在什麼情況 */
import { Game } from '@/core/game';
import { newGameState } from '@/core/state';
import type { ClassId } from '@/core/types';
import { SLOTS } from '@/data/items';
import { upgradeDelta } from '@/systems/hero';
import { canEquip } from '@/systems/items';
import { equipItem } from '@/systems/forge';
import { TALENT_TREES } from '@/data/talents';
import { canTalent, talentUp } from '@/systems/progression';

const cls = (process.argv[2] ?? 'ranger') as ClassId;
const hours = Number(process.argv[3] ?? 6);
let clock = Date.now();
const g = new Game(newGameState('d', cls, clock, 3), { headless: true, now: () => clock });
g.ev.muted = false;
const deaths: string[] = [];
let lastHits: string[] = [];
g.ev.on('unit:hit', e => {
  if (e.tgt.kind !== 'hero') return;
  lastHits.push(`${e.src?.name ?? '?'}${e.dot ? '(DoT)' : ''}${e.crit ? '暴' : ''}:${Math.round(e.amount)}`);
  if (lastHits.length > 6) lastHits.shift();
});
g.ev.on('hero:death', () => {
  const s = g.state;
  const foes = g.battle.aliveEnemies().map(u => `${u.name}${u.boss ? '[王]' : ''}${u.elite.length ? '[精]' : ''}Lv${u.level}`);
  deaths.push(`Lv${s.hero.level} 關${s.progress.stage}/${s.progress.best[0]} ${s.progress.mode} 藥${s.potions.join('/')} 金${Math.round(s.cur.gold)} | 敵:${foes.join(',')} | 最後受擊:${lastHits.join(' ')}`);
});
for (let m = 0; m < hours * 60; m++) {
  for (let i = 0; i < 6; i++) { g.advance(10_000); clock += 10_000; }
  const s = g.state;
  for (const it of [...s.inventory]) if (canEquip(it, s.hero.classId, s.hero.level) && upgradeDelta(s, it).delta > 0) equipItem(g, it.uid, upgradeDelta(s, it).slot);
  for (const n of TALENT_TREES[s.hero.classId].nodes) while (canTalent(s, n.id) === null) talentUp(g, n.id);
  void SLOTS;
}
console.log(`共 ${deaths.length} 次死亡`);
console.log(deaths.slice(0, 12).join('\n'));
console.log('...');
console.log(deaths.slice(-8).join('\n'));
