import { fmt } from '@/core/format';
import { rich } from '../emoji';
import { TALENT_TIER_REQ, TALENT_TREES } from '@/data/talents';
import { talentSpent, talentTotal } from '@/systems/hero';
import { canTalent, resetTalents, RESET_TALENT_GOLD, talentAvailable, talentUp } from '@/systems/progression';
import { CIcon, confirmModal } from '../common';
import { g, refresh, uiTick } from '../store';

const TIER_NAMES = ['基礎', '進階', '專精', '大師', '傳奇', '終極'];

export function TalentsPanel() {
  void uiTick.value;
  const gm = g();
  const s = gm.state;
  const tree = TALENT_TREES[s.hero.classId];
  const spent = talentSpent(s);
  return (
    <div>
      <div class="row between">
        <h3 style={{ margin: '0px' }}>天賦樹 <span class="count">每 3 級獲得 1 點</span></h3>
        <span class="chip on">可用 {talentAvailable(s)} ／ 已投入 {spent} ／ 總計 {talentTotal(s)}</span>
      </div>
      <div class="small muted" style={{ margin: '6px 0 12px' }}>左排偏攻擊、中排偏防禦、右排偏輔助。越下層需要投入越多點才能解鎖。</div>
      <div class="tree">
        {[0, 1, 2, 3, 4, 5].map(tier => (
          <>
            <div class="tier-label">{TIER_NAMES[tier]}　{spent < TALENT_TIER_REQ[tier] ? `（需投入 ${TALENT_TIER_REQ[tier]} 點）` : ''}</div>
            {tree.nodes.filter(n => n.tier === tier).sort((a, b) => a.col - b.col).map(n => {
              const r = s.hero.talentRanks[n.id] ?? 0;
              const why = canTalent(s, n.id);
              const locked = spent < TALENT_TIER_REQ[tier];
              return (
                <div
                  class={'tnode' + (r > 0 ? ' has' : '') + (r >= n.maxRank ? ' max' : '') + (locked ? ' locked' : '') + (!why ? ' can' : '')}
                  onClick={() => { if (!why) { talentUp(gm, n.id); refresh(); } }}
                  title={why ?? '點擊升級'}
                >
                  <div class="ic">{rich(n.icon)}</div>
                  <div class="nm">{n.name}</div>
                  <div class="rk">{r}/{n.maxRank}</div>
                  <div class="ds">{n.desc(Math.max(1, r))}</div>
                  {r > 0 && r < n.maxRank && <div class="tiny dim">下一級：{n.desc(r + 1)}</div>}
                </div>
              );
            })}
          </>
        ))}
      </div>
      <div class="row" style={{ justifyContent: 'flex-end', marginTop: '14px' }}>
        <button class="btn sm" onClick={() => confirmModal('重置天賦', <p>花費 <CIcon k="gold" />{fmt(RESET_TALENT_GOLD(s.hero.level))} 退回所有天賦點。</p>, () => { resetTalents(gm); refresh(); })}>重置天賦</button>
      </div>
    </div>
  );
}
