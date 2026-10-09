import { useEffect, useState } from 'preact/hooks';
import { DIFFICULTIES } from '@/core/formulas';
import { fmt } from '@/core/format';
import type { ClassId } from '@/core/types';
import { ADVANCES, CLASSES } from '@/data/classes';
import { getMonster } from '@/data/monsters';
import { REGIONS } from '@/data/regions';
import { monsterThumb } from '@/render/icons';
import { fetchBoard, leaderboardEnabled, leaveBoard, submitScores, type BoardId, type BoardRow } from '@/online/leaderboard';
import { weekKey } from '@/online/week';
import { confirmModal } from '../common';
import { rich } from '../emoji';
import { g, refresh, saveNow, uiTick } from '../store';

const BOARDS: [BoardId, string, string][] = [
  ['progress', '🗺 冒險進度', '推到最遠的關卡（含惡夢、地獄）。'],
  ['boss', '⏱ 首領速通', '打倒區域首領花了幾秒。只有英雄等級不高於首領時才算——比的是打法，不是等級。'],
  ['tower', '🗼 本週高塔', '這一週（台灣時間週一 00:00 重置）在無盡之塔通過的最高層。'],
  ['power', '💪 戰力', '目前的戰力。'],
];

function scoreText(board: BoardId, v: number) {
  switch (board) {
    case 'progress': {
      const d = Math.floor(v / 80), st = v % 80;
      return `${DIFFICULTIES[d]?.name ?? ''} ${Math.floor(st / 10) + 1}-${(st % 10) + 1}`;
    }
    case 'boss': return `${(v / 1000).toFixed(1)} 秒`;
    case 'tower': return `第 ${v} 層`;
    case 'power': return fmt(v);
  }
}

const medal = (pos: number) => (pos === 1 ? '🥇' : pos === 2 ? '🥈' : pos === 3 ? '🥉' : String(pos));

export function RankPanel() {
  void uiTick.value;
  const gm = g();
  const s = gm.state;
  const [board, setBoard] = useState<BoardId>('progress');
  const [cls, setCls] = useState<ClassId | null>(null);
  const [diff, setDiff] = useState(0);
  const [region, setRegion] = useState(Math.min(7, Math.max(0, Math.floor((s.progress.best[0] + 1) / 10) - 1)));
  const [rows, setRows] = useState<BoardRow[] | null>(null);
  const [err, setErr] = useState('');
  const [busy, setBusy] = useState(false);
  const [reload, setReload] = useState(0);
  const bossKey = `${diff}:${REGIONS[region].boss}`;
  const key = board === 'boss' ? bossKey : null;

  useEffect(() => {
    if (!leaderboardEnabled()) return;
    let alive = true;
    setRows(null);
    setErr('');
    fetchBoard(s, board, key, cls).then(r => { if (alive) setRows(r); }).catch(e => { if (alive) setErr(String(e.message ?? e)); });
    return () => { alive = false; };
  }, [board, key, cls, reload]);

  if (!leaderboardEnabled()) {
    return <div class="panel-note">{rich('🏆')} 排行榜還沒有開通（遊戲作者需要先設定伺服器）。</div>;
  }

  const join = async () => {
    setBusy(true);
    s.online.joined = true;
    s.online.lastSubmit = Date.now(); // 避免自動上傳同時再送一次
    try { await submitScores(s); saveNow(); setReload(x => x + 1); } catch (e) { setErr(String((e as Error).message)); }
    setBusy(false);
    refresh();
  };
  const upload = async () => {
    setBusy(true);
    try {
      const ok = await submitScores(s);
      gm.toast(ok ? '已上傳最新成績' : '上傳太頻繁，請稍後再試', ok ? 'good' : 'warn', '🏆');
      setReload(x => x + 1);
    } catch (e) { setErr(String((e as Error).message)); }
    setBusy(false);
  };
  const leave = () => confirmModal('退出排行榜？', <p>伺服器上你的所有成績都會刪除。之後可以再加入。</p>, () => {
    void leaveBoard(s).then(() => { saveNow(); setReload(x => x + 1); refresh(); });
  }, '退出', true);

  const mins = s.online.lastSubmit ? Math.floor((Date.now() - s.online.lastSubmit) / 60_000) : null;
  const myBoss = s.records.boss[bossKey];
  const top = rows?.filter(r => r.pos <= 50) ?? [];
  const meBelow = rows?.find(r => r.is_me && r.pos > 50);

  return (
    <div class="rank">
      <div class="rank-join">
        {s.online.joined ? (
          <>
            <div class="small">以「<b>{s.hero.name}</b>」參加排行榜{mins !== null && `・${mins < 1 ? '剛剛' : `${mins} 分鐘前`}上傳`}（每 10 分鐘自動上傳）</div>
            <div class="row" style={{ gap: '6px' }}>
              <button class="btn sm" disabled={busy} onClick={() => void upload()}>立即上傳</button>
              <button class="btn sm ghost" onClick={leave}>退出</button>
            </div>
          </>
        ) : (
          <>
            <div class="small">加入後會上傳：角色名稱、職業、等級、轉生次數與下面四種成績。不會上傳其他資料。</div>
            <button class="btn primary sm" disabled={busy} onClick={() => void join()}>以「{s.hero.name}」加入排行榜</button>
          </>
        )}
      </div>

      <div class="subtabs">
        {BOARDS.map(([id, n]) => <button class={'btn sm' + (board === id ? ' primary' : '')} onClick={() => setBoard(id)}>{rich(n)}</button>)}
      </div>
      <div class="small muted" style={{ marginBottom: '8px' }}>
        {BOARDS.find(b => b[0] === board)![2]}{board === 'tower' && `（${weekKey(Date.now())}）`}
      </div>

      {board === 'boss' && (
        <div class="rank-boss">
          <div class="row wrap" style={{ gap: '4px' }}>
            {DIFFICULTIES.map(d => <button class={'btn xs' + (diff === d.id ? ' primary' : '')} onClick={() => setDiff(d.id)}>{d.name}</button>)}
          </div>
          <div class="rank-bosses">
            {REGIONS.map((r, i) => {
              const m = getMonster(r.boss);
              return (
                <button class={'rb' + (region === i ? ' on' : '')} title={m.name} onClick={() => setRegion(i)}>
                  <img src={monsterThumb(m, 40)} alt="" />
                  <span>{i + 1}</span>
                </button>
              );
            })}
          </div>
          <div class="small">
            <b>{getMonster(REGIONS[region].boss).name}</b>・你的紀錄：{myBoss !== undefined ? <span class="gold">{(myBoss / 1000).toFixed(1)} 秒</span> : <span class="muted">尚無（需在不高於首領等級時打倒）</span>}
          </div>
        </div>
      )}

      <div class="row wrap" style={{ gap: '4px', margin: '8px 0' }}>
        <button class={'btn xs' + (cls === null ? ' primary' : '')} onClick={() => setCls(null)}>全部職業</button>
        {(Object.keys(CLASSES) as ClassId[]).map(id => <button class={'btn xs' + (cls === id ? ' primary' : '')} onClick={() => setCls(id)}>{CLASSES[id].name}</button>)}
        <button class="btn xs ghost" onClick={() => setReload(x => x + 1)}>重新整理</button>
      </div>

      {err && <div class="bad small">讀取失敗：{err}</div>}
      {!rows && !err && <div class="muted small">讀取中…</div>}
      {rows && !rows.length && <div class="muted small">還沒有人上榜，搶第一吧！</div>}
      {rows && rows.length > 0 && (
        <div class="rank-list">
          {top.map(r => <Row r={r} board={board} />)}
          {meBelow && <><div class="rank-gap">⋯</div><Row r={meBelow} board={board} /></>}
        </div>
      )}
    </div>
  );
}

function Row({ r, board }: { r: BoardRow; board: BoardId }) {
  const job = r.adv_id ? ADVANCES[r.adv_id as keyof typeof ADVANCES]?.name : CLASSES[r.class_id as ClassId]?.name;
  return (
    <div class={'rank-row' + (r.is_me ? ' me' : '') + (r.pos <= 3 ? ' top' : '')}>
      <span class="rk">{rich(medal(r.pos))}</span>
      <span class="nm">
        <b>{r.name}</b>
        <span class="tiny muted">{job ?? ''}・Lv.{r.level}{r.rebirths ? `・轉生 ${r.rebirths}` : ''}</span>
      </span>
      <span class="sc">{scoreText(board, r.score)}</span>
    </div>
  );
}
