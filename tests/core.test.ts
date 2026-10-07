import { describe, expect, it } from 'vitest';
import { Rng } from '@/core/rng';
import { computeStats, flat, inc, more } from '@/core/stats';
import { Game } from '@/core/game';
import { newGameState } from '@/core/state';
import { RARITIES, AFFIX_MAP } from '@/data/items';
import { MONSTERS } from '@/data/monsters';
import { REGIONS } from '@/data/regions';
import { ALL_SKILLS, getSkill } from '@/data/skills';
import { TALENT_TREES } from '@/data/talents';
import { generateItem } from '@/systems/items';
import { enhance } from '@/systems/forge';
import { migrate } from '@/save/storage';
import { applyOffline } from '@/systems/offline';
import { claimQuest, currentQuest } from '@/systems/quests';
import { rebirth } from '@/systems/rebirth';
import { gainXp } from '@/systems/progression';
import { xpToNext } from '@/core/formulas';
import type { ClassId } from '@/core/types';

const T0 = 1_700_000_000_000;
function makeGame(cls: ClassId = 'warrior', seed = 42) {
  let clock = T0;
  const g = new Game(newGameState('測試', cls, clock, seed), { headless: true, now: () => clock });
  return { g, tick: (ms: number) => { g.advance(ms); clock += ms; } };
}

describe('亂數', () => {
  it('同樣的種子產生同樣的序列', () => {
    const a = new Rng(7), b = new Rng(7);
    for (let i = 0; i < 100; i++) expect(a.next()).toBe(b.next());
  });
  it('weightedIndex 尊重權重', () => {
    const r = new Rng(1);
    const counts = [0, 0];
    for (let i = 0; i < 10000; i++) counts[r.weightedIndex([1, 3])]++;
    expect(counts[1] / counts[0]).toBeGreaterThan(2.5);
    expect(counts[1] / counts[0]).toBeLessThan(3.5);
  });
});

describe('數值計算', () => {
  it('flat → inc → more 依序計算', () => {
    const s = computeStats({ base: { atk: 100 }, mods: [flat('atk', 50), inc('atk', 20), inc('atk', 30), more('atk', 10)], conversions: [] });
    expect(s.atk).toBeCloseTo(150 * 1.5 * 1.1);
  });
  it('主屬性會換算成次要屬性', () => {
    const s = computeStats({ base: { str: 10, vit: 10 }, mods: [flat('allStats', 5)] });
    expect(s.str).toBe(15);
    expect(s.atk).toBe(15 * 2 + 5 * 1); // 全屬性也加到敏捷
    expect(s.hp).toBe(15 * 3 + 15 * 12);
  });
});

describe('內容資料完整性', () => {
  it('每個區域的怪物與首領都存在', () => {
    const ids = new Set(MONSTERS.map(m => m.id));
    for (const r of REGIONS) {
      for (const m of r.monsters) expect(ids.has(m)).toBe(true);
      expect(ids.has(r.boss)).toBe(true);
    }
  });
  it('怪物技能都能找到', () => {
    for (const m of MONSTERS) for (const s of m.skills ?? []) expect(() => getSkill(s)).not.toThrow();
  });
  it('每個職業各有 10 個技能、天賦樹 18 個節點', () => {
    for (const c of ['warrior', 'ranger', 'mage', 'cleric']) {
      expect(ALL_SKILLS.filter(s => s.classId === c).length).toBe(10);
      expect(TALENT_TREES[c as ClassId].nodes.length).toBe(18);
    }
  });
});

describe('裝備產生', () => {
  it('詞綴數量符合稀有度且不重複', () => {
    const { g } = makeGame();
    for (let i = 0; i < 300; i++) {
      const rarity = (i % 4) as 0 | 1 | 2 | 3;
      const it = generateItem({ rng: g.rng, nextUid: g.nextUid, classId: 'mage' }, { ilvl: 1 + (i % 80), rarity });
      expect(it.affixes.length).toBe(RARITIES[rarity].affixes);
      expect(new Set(it.affixes.map(a => a.id)).size).toBe(it.affixes.length);
      for (const a of it.affixes) expect(AFFIX_MAP.has(a.id)).toBe(true);
      expect(it.implicit.length).toBeGreaterThan(0);
    }
  });
  it('傳說會變成具名傳說裝備', () => {
    const { g } = makeGame();
    const it = generateItem({ rng: g.rng, nextUid: g.nextUid, classId: 'warrior' }, { ilvl: 60, rarity: 4 });
    expect(it.unique).toBeTruthy();
  });
});

describe('戰鬥', () => {
  it('新角色能在幾分鐘內打過前幾關', () => {
    for (const cls of ['warrior', 'ranger', 'mage', 'cleric'] as ClassId[]) {
      const { g, tick } = makeGame(cls);
      tick(5 * 60_000);
      expect(g.state.progress.best[0]).toBeGreaterThanOrEqual(2);
      expect(g.state.counters.kills).toBeGreaterThan(20);
    }
  });
  it('升級會回滿血並給點數', () => {
    const { g } = makeGame();
    gainXp(g, xpToNext(1) + 1);
    expect(g.state.hero.level).toBe(2);
    expect(g.state.hero.skillPoints + Object.values(g.state.hero.skillRanks).reduce((a, b) => a + b, 0)).toBeGreaterThanOrEqual(2);
  });
});

describe('強化', () => {
  it('+0 必定成功，+10 以上失敗會碎裂，保護卷軸可以保住', () => {
    const { g } = makeGame();
    const s = g.state;
    s.cur.gold = 1e12;
    s.cur.stones = 1e6;
    const w = s.equipment.weapon!;
    expect(enhance(g, w.uid, false)).toBe('success');
    expect(w.enh).toBe(1);
    w.enh = 19;
    s.cur.protect = 1000;
    let protectedHits = 0;
    // 每次都從 +19 開始（成功升到 +20 不算失敗），直到出現一次保護
    for (let i = 0; i < 200 && protectedHits === 0; i++) { w.enh = 19; if (enhance(g, w.uid, true) === 'protected') protectedHits++; }
    expect(s.equipment.weapon).not.toBeNull();
    expect(protectedHits).toBeGreaterThan(0);
    w.enh = 19;
    let broke = false;
    for (let i = 0; i < 200 && s.equipment.weapon; i++) { s.equipment.weapon!.enh = 19; if (enhance(g, s.equipment.weapon!.uid, false) === 'break') broke = true; }
    expect(broke).toBe(true);
    expect(s.equipment.weapon).toBeNull();
  });
});

describe('存檔', () => {
  it('舊存檔缺欄位時會補上預設值', () => {
    const s = newGameState('舊', 'ranger', T0, 1) as unknown as Record<string, unknown>;
    delete s.merchant;
    delete (s.settings as Record<string, unknown>).autoBuyPotions;
    const m = migrate(JSON.parse(JSON.stringify(s)))!;
    expect(m.merchant).toBeDefined();
    expect(m.settings.autoBuyPotions).toBe(true);
    expect(m.hero.classId).toBe('ranger');
  });
  it('無效資料回傳 null', () => {
    expect(migrate({ foo: 1 })).toBeNull();
    expect(migrate('x')).toBeNull();
  });
});

describe('離線、任務與轉生', () => {
  it('離線一小時有收益', () => {
    const { g, tick } = makeGame();
    tick(2 * 60_000);
    const lv = g.state.hero.level;
    const xp = g.state.counters.xpEarned ?? 0;
    const rep = applyOffline(g, 3600_000)!;
    expect(rep.kills).toBeGreaterThan(0);
    expect((g.state.counters.xpEarned ?? 0) > xp || g.state.hero.level > lv).toBe(true);
  });
  it('完成任務後可以領取並前進', () => {
    const { g, tick } = makeGame();
    tick(5 * 60_000);
    const before = g.state.quests.main;
    expect(currentQuest(g)!.id).toBe('q1_1');
    claimQuest(g);
    expect(g.state.quests.main).toBe(before + 1);
  });
  it('轉生重置等級並給星魂', () => {
    const { g } = makeGame();
    g.state.progress.best[0] = 49;
    g.state.rebirth.bestStageEver = 49;
    g.state.hero.level = 50;
    rebirth(g);
    expect(g.state.hero.level).toBe(1);
    expect(g.state.cur.starSouls).toBeGreaterThan(0);
    expect(g.state.rebirth.count).toBe(1);
  });
});
