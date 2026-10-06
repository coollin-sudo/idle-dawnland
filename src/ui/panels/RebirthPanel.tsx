import { fmt } from '@/core/format';
import { STAR_NODES, starCost } from '@/data/meta';
import { canRebirth, rebirth, soulsPreview, starUpgrade, startStageAfterRebirth } from '@/systems/rebirth';
import { CIcon, Cost, confirmModal } from '../common';
import { g, refresh } from '../store';

export function RebirthPanel() {
  const gm = g();
  const s = gm.state;
  const souls = soulsPreview(gm);
  const ok = canRebirth(gm);
  return (
    <div>
      <div class="card hl">
        <div class="row" style={{ gap: '12px' }}>
          <img src={undefined} alt="" style={{ display: 'none' }} />
          <div style={{ fontSize: '40px' }}>🌌</div>
          <div class="grow">
            <div style={{ fontWeight: 900, fontSize: '16px' }}>轉生</div>
            <div class="small muted">放棄目前的等級、關卡進度、金幣、技能與天賦點，換取「星魂」。裝備、寵物、寶石、材料、成就與圖鑑都會保留。</div>
            <div style={{ marginTop: '6px' }}>轉生可獲得：<b class="gold"><CIcon k="starSouls" />{fmt(souls)}</b>　<span class="small muted">（依歷史最高關卡與等級計算）</span></div>
            <div class="small muted">轉生次數 {s.rebirth.count}・轉生後從第 {startStageAfterRebirth(gm) + 1} 關開始</div>
          </div>
          <button class="btn primary" disabled={!ok || souls <= 0} onClick={() => confirmModal('確定轉生？', <p>將重置等級與關卡進度，獲得 <CIcon k="starSouls" />{fmt(souls)} 星魂。</p>, () => { rebirth(gm); refresh(); }, '轉生', true)}>轉生</button>
        </div>
        {!ok && <div class="small bad" style={{ marginTop: '6px' }}>需要先在普通難度通關第 5 區（霜語山脈）。</div>}
      </div>

      <h3>星魂天賦 <span class="count">持有 <Cost k="starSouls" n={s.cur.starSouls} /></span></h3>
      <div class="list">
        {STAR_NODES.map(n => {
          const r = s.rebirth.ranks[n.id] ?? 0;
          const max = r >= n.max;
          const cost = starCost(n, r);
          return (
            <div class="li">
              <div class="ic">{n.icon}</div>
              <div class="grow">
                <div class="t">{n.name} <span class="small muted">{r}/{n.max}</span></div>
                <div class="d">{r > 0 ? n.desc(r) : '尚未學習'}{!max && <span class="dim">　→ {n.desc(r + 1)}</span>}</div>
              </div>
              <button class="btn sm" disabled={max || s.cur.starSouls < cost} onClick={() => { starUpgrade(gm, n.id); refresh(); }}>{max ? '已滿' : <Cost k="starSouls" n={cost} have={s.cur.starSouls} />}</button>
            </div>
          );
        })}
      </div>
    </div>
  );
}
