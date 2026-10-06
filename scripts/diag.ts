/** 診斷：印出指定等級英雄與怪物的數值，並模擬一波戰鬥的經過 */
import { Game } from '@/core/game';
import { newGameState } from '@/core/state';
import type { ClassId } from '@/core/types';
import { heroStats, combatPower } from '@/systems/hero';
import { gainXp } from '@/systems/progression';
import { xpToNext, mobHp, mobAtk, mobDef, armorDR } from '@/core/formulas';

const cls = (process.argv[2] ?? 'warrior') as ClassId;
const lv = Number(process.argv[3] ?? 5);
const stage = Number(process.argv[4] ?? lv - 1);

let clock = Date.now();
const s = newGameState('diag', cls, clock, 7);
const g = new Game(s, { headless: true, now: () => clock });
let total = 0;
for (let l = 1; l < lv; l++) total += xpToNext(l);
gainXp(g, total);
s.progress.stage = stage;
s.progress.best[0] = stage - 1;
g.startActivity('stage');
const st = heroStats(s);
console.log(`英雄 ${cls} Lv${s.hero.level} hp ${st.hp.toFixed(0)} atk ${st.atk.toFixed(0)} matk ${st.matk.toFixed(0)} def ${st.def.toFixed(0)} crit ${st.crit.toFixed(1)} 戰力 ${combatPower(s, st)}`);
const L = stage + 1;
console.log(`怪物 Lv${L} hp ${mobHp(L).toFixed(0)} atk ${mobAtk(L).toFixed(0)} def ${mobDef(L).toFixed(0)}  英雄減傷 ${(armorDR(st.def, L) * 100).toFixed(1)}%`);
const ev = g.ev;
ev.muted = false;
let dealt = 0, taken = 0;
ev.on('unit:hit', e => { if (e.tgt.side === 'enemy') dealt += e.amount; else taken += e.amount; });
let deaths = 0;
ev.on('hero:death', () => deaths++);
const t0 = s.counters.kills ?? 0;
for (let i = 0; i < 600; i++) { g.advance(100); clock += 100; }
console.log(`60 秒：擊殺 ${(s.counters.kills ?? 0) - t0}，造成 ${dealt.toFixed(0)}（${(dealt / 60).toFixed(0)}/s），承受 ${taken.toFixed(0)}（${(taken / 60).toFixed(0)}/s），死亡 ${deaths}`);
