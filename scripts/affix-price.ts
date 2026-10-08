/** 依「屬性定價」原則算出各詞綴的建議縮放倍數（輸出 JSON） */
import { Game } from '@/core/game';
import { newGameState } from '@/core/state';
import type { ClassId, Item } from '@/core/types';
import { AFFIXES } from '@/data/items';
import { affixRange, UTILITY_STATS } from '@/systems/items';
import { powerWith } from '@/systems/hero';

const ILVL = 40;
const CLASS_SPECIFIC = new Set(['atk', 'matk', 'atkPct', 'matkPct', 'physDmg', 'magDmg', 'str', 'dex', 'int', 'fireDmg', 'iceDmg', 'lightningDmg', 'holyDmg', 'shadowDmg', 'healPower', 'dotDmg', 'petDmg']);
const SITUATIONAL: Record<string, number> = { bossDmg: 0.75, fireRes: 0.75, iceRes: 0.75, lightningRes: 0.75, shadowRes: 0.75, statusChance: 0.85 };
const vals = new Map<string, number[]>();
for (const cls of ['warrior', 'ranger', 'mage', 'cleric'] as ClassId[]) {
  const g = new Game(newGameState('t', cls, Date.now(), 3), { headless: true, now: () => Date.now() });
  const s = g.state;
  s.hero.level = 40;
  // 讓法師帶滿元素技能，元素傷害才量得到
  s.equipment.ring2 = null;
  const b0 = powerWith(s);
  for (const def of AFFIXES) {
    if (UTILITY_STATS.includes(def.stat)) continue;
    const [lo, hi] = affixRange(def, ILVL);
    const probe: Item = { uid: -1, slot: 'ring', base: 'ring', name: 'p', rarity: 3, ilvl: ILVL, implicit: [], affixes: [{ id: def.id, value: (lo + hi) / 2, q: 0.5 }], enh: 0 };
    const d = powerWith(s, { ring2: probe }) - b0;
    vals.set(def.id, [...(vals.get(def.id) ?? []), d]);
  }
}
const eff = new Map<string, number>();
for (const [id, l] of vals) eff.set(id, CLASS_SPECIFIC.has(id) ? Math.max(...l) : l.reduce((a, b) => a + b, 0) / l.length);
const sorted = [...eff.values()].filter(v => v > 1).sort((a, b) => a - b);
const T = sorted[Math.floor(sorted.length / 2)];
const scale: Record<string, number> = {};
for (const [id, v] of eff) {
  if (v <= 1) continue; // 量不到（例如沒有職業會用到的元素）就不調
  const target = T * (SITUATIONAL[id] ?? 1);
  scale[id] = Math.round(Math.min(2.5, Math.max(0.6, target / v)) * 100) / 100;
}
console.log(JSON.stringify({ T: Math.round(T), eff: Object.fromEntries([...eff].map(([k, v]) => [k, Math.round(v)])), scale }));
