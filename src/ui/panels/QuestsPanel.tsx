import { fmt } from '@/core/format';
import { DAILY_CHEST_GEMS } from '@/data/meta';
import { CHAPTERS, MAIN_QUESTS } from '@/data/quests';
import { SCENES } from '@/data/story';
import { claimDaily, claimDailyChest, claimQuest, currentQuest, dailyProgress, describeReward, questProgress, refreshDailies } from '@/systems/quests';
import { Bar, Cost, NpcHeader } from '../common';
import { g, refresh, storyQueue } from '../store';

export function QuestsPanel() {
  const gm = g();
  const s = gm.state;
  refreshDailies(gm);
  const q = currentQuest(gm);
  const allClaimed = s.quests.daily.length > 0 && s.quests.daily.every(d => d.claimed);
  return (
    <div>
      <NpcHeader npc="aria" lines={['永晝水晶的碎片還散落在各地，我們繼續前進吧。', '每日任務完成後別忘了開寶箱！', '你成長得真快，守護者。']} />
      <h3>主線任務 <span class="count">{s.quests.main}/{MAIN_QUESTS.length}</span></h3>
      {q ? (() => {
        const p = questProgress(gm, q);
        const done = p.cur >= p.goal;
        return (
          <div class={'card' + (done ? ' hl' : '')}>
            <div class="tiny gold" style={{ letterSpacing: '.1em', fontWeight: 800 }}>第 {q.chapter + 1} 章・{CHAPTERS[q.chapter]}</div>
            <div style={{ fontWeight: 900, fontSize: '16px', margin: '2px 0 6px' }}>{q.name}</div>
            <Bar value={p.cur} max={p.goal} kind="gold" label={`${fmt(Math.max(0, p.cur))} / ${fmt(p.goal)}`} />
            <div class="row between" style={{ marginTop: '8px' }}>
              <span class="small muted">獎勵：{describeReward(q.reward)}</span>
              <button class="btn primary sm" disabled={!done} onClick={() => { claimQuest(gm); refresh(); }}>領取</button>
            </div>
          </div>
        );
      })() : <div class="card hl">🏆 所有主線任務都完成了！</div>}

      <h3>每日任務 <span class="count">每天 0 點更新</span></h3>
      <div class="list">
        {s.quests.daily.map(d => {
          const p = dailyProgress(gm, d.id);
          const done = p.cur >= p.goal;
          return (
            <div class={'li' + (d.claimed ? ' claimed' : done ? ' done' : '')}>
              <div class="grow">
                <div class="t">{p.def.name}</div>
                <Bar value={p.cur} max={p.goal} kind="green" size="sm" />
                <div class="tiny muted" style={{ marginTop: '2px' }}>{fmt(p.cur)}/{fmt(p.goal)}　獎勵 <Cost k="gems" n={p.def.gems} /> + 金幣</div>
              </div>
              <button class="btn sm primary" disabled={!done || d.claimed} onClick={() => { claimDaily(gm, d.id); refresh(); }}>{d.claimed ? '已領取' : '領取'}</button>
            </div>
          );
        })}
      </div>
      <div class={'card' + (allClaimed && !s.quests.dailyChest ? ' hl' : '')} style={{ marginTop: '10px' }}>
        <div class="row between">
          <div>🎁 <b>每日寶箱</b><div class="tiny muted">完成全部每日任務：<Cost k="gems" n={DAILY_CHEST_GEMS} /> <Cost k="stones" n={10} /> + 普通寵物蛋</div></div>
          <button class="btn sm primary" disabled={!allClaimed || s.quests.dailyChest} onClick={() => { claimDailyChest(gm); refresh(); }}>{s.quests.dailyChest ? '已領取' : '開啟'}</button>
        </div>
      </div>

      <h3>回顧劇情</h3>
      <div class="row wrap" style={{ gap: '6px' }}>
        {s.story.filter(id => SCENES[id]).map(id => <button class="btn xs" onClick={() => { storyQueue.value = [...storyQueue.value, id]; }}>{SCENES[id].title}</button>)}
      </div>
    </div>
  );
}
