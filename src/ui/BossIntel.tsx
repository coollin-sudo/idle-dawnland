import { ADVANCES } from '@/data/classes';
import { BOSS_MECHS, type Counter, type CounterReq } from '@/data/bossMechanics';
import { getMonster } from '@/data/monsters';
import { REGIONS } from '@/data/regions';
import { getSkill } from '@/data/skills';
import { SKILL_SPECS } from '@/data/skillSpecs';
import { TALENT_TREES } from '@/data/talents';
import type { GameState } from '@/core/types';
import { rich } from './emoji';

/** 玩家是否已經具備某個解法條件 */
function reqMet(s: GameState, r: CounterReq): boolean {
  const h = s.hero;
  switch (r.kind) {
    case 'skill': return h.loadout.includes(r.id) && (h.skillRanks[r.id] ?? 0) > 0;
    case 'spec': return h.loadout.includes(r.id) && h.skillSpecs?.[r.id] === r.spec && (h.skillRanks[r.id] ?? 0) >= 5;
    case 'talent': return (h.talentRanks[r.id] ?? 0) > 0;
    case 'hold': { const i = h.loadout.indexOf(r.id); return i >= 0 && !!h.loadoutHold?.[i]; }
    case 'first': return h.loadout[0] === r.id;
  }
}

function reqLabel(r: CounterReq): string {
  switch (r.kind) {
    case 'skill': return `裝上「${getSkill(r.id).name}」`;
    case 'spec': return `「${getSkill(r.id).name}」專精選「${SKILL_SPECS[r.id]?.[r.spec]?.name ?? '?'}」`;
    case 'talent': return `天賦「${Object.values(TALENT_TREES).flatMap(t => t.nodes).find(n => n.id === r.id)?.name ?? r.id}」`;
    case 'hold': return `「${getSkill(r.id).name}」設為 ⏸ 保留`;
    case 'first': return `「${getSkill(r.id).name}」放第 1 格`;
  }
}

/** 某個區域首領的機制說明，以及本職業可以用的解法（✓ 表示已具備） */
export function BossIntel({ s, bossId, compact }: { s: GameState; bossId: string; compact?: boolean }) {
  const boss = getMonster(bossId);
  const mech = boss.mech ? BOSS_MECHS[boss.mech] : undefined;
  if (!mech) return null;
  const list: Counter[] = mech.counters[s.hero.classId];
  return (
    <div class="boss-intel">
      <div class="bi-h">{rich('👑')} <b>{boss.name}</b>・<span class="gold">{mech.name}</span></div>
      <div class="small">{mech.desc}</div>
      {!compact && <div class="small muted" style={{ marginTop: '4px' }}>{rich('💡')} {mech.hint}</div>}
      <div class="bi-list">
        {list.map(c => {
          const advOk = !c.adv || c.adv === s.hero.advId;
          const done = advOk && c.req.every(r => reqMet(s, r));
          return (
            <div class={'bi-c' + (done ? ' ok' : '') + (advOk ? '' : ' off')}>
              <span class="bi-mark">{done ? '✓' : advOk ? '○' : '—'}</span>
              <div>
                <div>{c.text}{!advOk && c.adv && <span class="tiny muted">（限{ADVANCES[c.adv as keyof typeof ADVANCES]?.name}）</span>}</div>
                {advOk && !done && <div class="tiny muted">還差：{c.req.filter(r => !reqMet(s, r)).map(reqLabel).join('、')}</div>}
              </div>
            </div>
          );
        })}
      </div>
      {!compact && <div class="tiny muted" style={{ marginTop: '4px' }}>不一定要照清單做：技能、專精、天賦、裝備都可以自己組合，多練等級和裝備也能硬打過去。</div>}
    </div>
  );
}

/** 目前難度下，下一個還沒打倒的區域首領 */
export function nextBossId(s: GameState): string | null {
  const p = s.progress;
  const z = Math.floor((p.best[p.difficulty] + 1) / 10);
  return REGIONS[z]?.boss ?? null;
}
