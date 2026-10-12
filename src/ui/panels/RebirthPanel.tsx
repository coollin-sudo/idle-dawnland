import { fmt } from '@/core/format';
import { Emo, rich } from '../emoji';
import { STAR_NODES, starCost } from '@/data/meta';
import { canRebirth, rebirth, resonancePct, skipHint, soulsPreview, starUpgrade, startStageAfterRebirth } from '@/systems/rebirth';
import { CIcon, Cost, NpcHeader, confirmModal } from '../common';
import { g, refresh, uiTick } from '../store';

export function RebirthPanel() {
  void uiTick.value;
  const gm = g();
  const s = gm.state;
  const souls = soulsPreview(gm);
  const ok = canRebirth(gm);
  const earned = s.rebirth.soulsEarned ?? 0;
  const skip = skipHint(gm);
  return (
    <div>
      <NpcHeader npc="mila" lines={['碎片會吸收你的戰鬥經驗，凝結成星魂。', '轉生之後，靈魂本身會變得更強。', '覺得前進變慢的時候，就是轉生的好時機。']} />
      <div class="card hl">
        <div class="row" style={{ gap: '12px' }}>
          <img src={undefined} alt="" style={{ display: 'none' }} />
          <div style={{ fontSize: '40px' }}><Emo e="🌌" /></div>
          <div class="grow">
            <div style={{ fontWeight: 900, fontSize: '16px' }}>轉生</div>
            <div class="small muted">放棄目前的等級、關卡進度、技能與天賦點，換取「星魂」。金幣、裝備、寵物、寶石、材料、已解鎖的難度、成就與圖鑑都會保留。</div>
            <div style={{ marginTop: '6px' }}>轉生可獲得：<b class="gold"><CIcon k="starSouls" />{fmt(souls)}</b>　<span class="small muted">（依這一輪最遠的進度與等級計算）</span></div>
            {skip && (
              <div class="small" style={{ marginTop: '4px', color: '#f5d08a' }}>
                <Emo e="💡" /> 這一輪還沒打通{skip.need}，{skip.target}的進度依怪物強度換算成普通關卡。打通{skip.need}後，這次轉生可獲得的星魂會從 {fmt(skip.now)} 增加到 <b class="gold">{fmt(skip.full)}</b>。
              </div>
            )}
            <div class="small muted">轉生次數 {s.rebirth.count}・轉生後從普通難度第 {startStageAfterRebirth(gm) + 1} 關開始</div>
            <div style={{ marginTop: '6px' }}>
              星魂共鳴：攻擊、魔攻、生命額外 <b class="gold">+{fmt(Math.round(resonancePct(earned)))}%</b>
              {souls > 0 && <> → 轉生後 <b class="good">+{fmt(Math.round(resonancePct(earned + souls)))}%</b></>}
              <div class="tiny muted">依累計獲得的星魂（{fmt(earned)}）計算，沒有上限；累計越多，下一次轉生能推得越遠。</div>
            </div>
          </div>
          <button class="btn primary" disabled={!ok || souls <= 0} onClick={() => confirmModal('確定轉生？', <p>將重置等級與關卡進度，獲得 <CIcon k="starSouls" />{fmt(souls)} 星魂。</p>, () => { rebirth(gm); refresh(); }, '轉生', true)}>轉生</button>
        </div>
        {!ok && <div class="small bad" style={{ marginTop: '6px' }}>這一輪需要先推進到相當於普通難度第 5 區（霜語山脈）通關。直接打已解鎖的惡夢、地獄也算，會依怪物強度換算。</div>}
      </div>

      <h3>星魂天賦 <span class="count">持有 <Cost k="starSouls" n={s.cur.starSouls} /></span></h3>
      <div class="list">
        {STAR_NODES.map(n => {
          const r = s.rebirth.ranks[n.id] ?? 0;
          const max = r >= n.max;
          const cost = starCost(n, r);
          return (
            <div class="li">
              <div class="ic">{rich(n.icon)}</div>
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
