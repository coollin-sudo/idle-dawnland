import { DUNGEONS, TOWER_BOSSES, towerGems, towerLevel } from '@/data/dungeons';
import { rich } from '../emoji';
import { GEM_SHOP } from '@/data/shop';
import { getMonster } from '@/data/monsters';
import { UNLOCKS } from '@/data/quests';
import { monsterThumb } from '@/render/icons';
import { dungeonEntries, dungeonLevel, startDungeon, startTower } from '@/systems/activities';
import { buyDungeonEntry } from '@/systems/shop';
import { Cost } from '../common';
import { g, refresh, uiTick } from '../store';

export function ChallengePanel() {
  void uiTick.value;
  const gm = g();
  const s = gm.state;
  const busy = gm.activity.kind !== 'stage';
  const towerOpen = Math.max(...s.progress.best) >= UNLOCKS.tower || s.rebirth.count > 0;
  const floor = s.tower.floor;
  const nextBoss = getMonster(TOWER_BOSSES[(floor - 1) % TOWER_BOSSES.length]);
  return (
    <div>
      <h3>每日副本 <span class="count">每天各 2 次，副本等級 Lv.{dungeonLevel(gm)}</span></h3>
      <div class="list">
        {DUNGEONS.map(d => {
          const left = dungeonEntries(gm, d.id);
          const mon = getMonster(d.monsters[0]);
          return (
            <div class="li" style={{ borderColor: d.color + '55' }}>
              <div class="ic"><img src={monsterThumb(mon, 48)} alt="" /></div>
              <div class="grow">
                <div class="t">{rich(d.icon)} {d.name}</div>
                <div class="d">{d.desc}</div>
                <div class="tiny muted">剩餘 {left} 次・最佳紀錄擊殺 {s.dungeons.best[d.id] ?? 0}</div>
              </div>
              <div class="col" style={{ gap: '4px' }}>
                <button class="btn sm primary" disabled={busy || left <= 0} onClick={() => { startDungeon(gm, d.id); refresh(); }}>進入</button>
                {left <= 0 && <button class="btn xs" onClick={() => { buyDungeonEntry(gm, d.id); refresh(); }}>+1 次 <Cost k="gems" n={GEM_SHOP.dungeonEntry.gems} /></button>}
              </div>
            </div>
          );
        })}
      </div>

      <h3>無盡之塔 <span class="count">{towerOpen ? `最高 ${s.tower.best} 層` : '通關第 3 區解鎖'}</span></h3>
      <div class={'card' + (towerOpen ? ' hl' : '')} style={{ opacity: towerOpen ? 1 : 0.5 }}>
        <div class="row" style={{ gap: '12px' }}>
          <img src={monsterThumb(nextBoss, 72)} style={{ width: '72px', height: '72px' }} alt="" />
          <div class="grow">
            <div style={{ fontWeight: 900, fontSize: '16px' }}>第 {floor} 層・{nextBoss.name}</div>
            <div class="small muted">守衛 Lv.{towerLevel(floor)}・限時 45 秒・通過獎勵 <Cost k="gems" n={towerGems(floor)} />{floor % 10 === 0 ? '・🎁 十層寶箱（可能是套裝）' : ''}</div>
            <div class="tiny dim">勝利後自動挑戰下一層，失敗回到主線。每 10 層有寶箱與保護卷軸。</div>
          </div>
          <button class="btn primary" disabled={!towerOpen || busy} onClick={() => { startTower(gm); refresh(); }}>挑戰</button>
        </div>
      </div>
      {busy && <div class="small gold" style={{ marginTop: '10px' }}>正在進行：{gm.activity.title()}</div>}
    </div>
  );
}
