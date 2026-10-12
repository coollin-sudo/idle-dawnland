import { useEffect, useState } from 'preact/hooks';
import type { GameState } from '@/core/types';
import { ADVANCES, CLASSES } from '@/data/classes';
import { DIFFICULTIES } from '@/core/formulas';
import { fmtDuration } from '@/core/format';
import { audio } from '@/audio/audio';
import { artUrl } from '@/render/images';
import {
  type Account, type AccountIndex, MAX_CHARS, createAccount, deleteAccount, deleteChar, loadIndex, markLast, newSaveKey, renameAccount, setSlot, summarize,
} from '@/save/accounts';
import { loadState, saveState, setActiveSave } from '@/save/storage';
import { Create } from './Create';
import { HeroPreview } from './HeroPreview';
import { confirmModal } from './common';
import { openImport } from './panels/SettingsPanel';
import { startGame } from './store';

/**
 * 開場：選帳號 → 選角色（每個帳號 2 個角色位）→ 開始，或建立新帳號、新角色。
 * 角色彼此獨立，各自一份存檔。
 */
export function Launcher() {
  const [idx, setIdx] = useState<AccountIndex>(() => loadIndex());
  // 一律先顯示帳號清單（可以繼續上次的角色、選帳號，或以新帳號開始）
  const [accId, setAccId] = useState<string | null>(null);
  const [creating, setCreating] = useState<number | null>(null);
  const [, force] = useState(0);
  useEffect(() => { audio.setTrack('title'); }, []);
  const update = () => { setIdx({ ...idx }); force(n => n + 1); };
  const acc = idx.accounts.find(a => a.id === accId) ?? null;

  const play = (a: Account, slot: number) => {
    const key = a.slots[slot];
    if (!key) return;
    const s = loadState(key);
    if (!s) return confirmModal('讀不到這個角色', <p>存檔可能已損壞。要清掉這個角色位嗎？</p>, () => { deleteChar(idx, a.id, slot); update(); }, '清掉', true);
    audio.unlock();
    setActiveSave(key);
    markLast(idx, a.id, slot);
    startGame(s, { offline: true });
  };

  /** 新角色或匯入的存檔放進空位並開始 */
  const place = (a: Account, slot: number, s: GameState, fresh: boolean) => {
    const key = newSaveKey(idx);
    setSlot(idx, a.id, slot, key);
    setActiveSave(key);
    saveState(s, key);
    markLast(idx, a.id, slot);
    if (fresh) audio.play('levelup');
    startGame(s, { offline: !fresh });
  };

  if (acc && creating !== null) {
    return <Create accountName={acc.name} onBack={() => setCreating(null)} onStart={s => place(acc, creating, s, true)} onImport={() => openImport(s => place(acc, creating, s, false))} />;
  }

  const bg = artUrl('art/title/bg');
  const em = artUrl('art/title/emblem');
  return (
    <div class="create launcher">
      {bg && <div class="title-bg" style={{ backgroundImage: `url(${bg})` }} />}
      {em && <img class="title-emblem" src={em} alt="" />}
      <div class="logo">放置冒險</div>
      <div class="logo-sub">晨 曦 大 陸</div>
      {acc ? <AccountView idx={idx} acc={acc} onBack={() => setAccId(null)} onPlay={slot => play(acc, slot)} onCreate={setCreating} onImport={slot => openImport(s => place(acc, slot, s, false))} onChanged={update} /> : (
        <AccountList idx={idx} onPick={id => setAccId(id)} onPlayLast={() => { const l = idx.last!; const a = idx.accounts.find(x => x.id === l.account)!; play(a, l.slot); }} onChanged={update} />
      )}
      <div class="small dim" style={{ marginTop: '26px' }}>原創作品・進度保存在你的瀏覽器・每個帳號最多 {MAX_CHARS} 個角色，角色之間各自獨立</div>
    </div>
  );
}

function AccountList({ idx, onPick, onPlayLast, onChanged }: { idx: AccountIndex; onPick: (id: string) => void; onPlayLast: () => void; onChanged: () => void }) {
  const [name, setName] = useState('');
  const [adding, setAdding] = useState(idx.accounts.length === 0);
  const last = idx.last && idx.accounts.find(a => a.id === idx.last!.account)?.slots[idx.last.slot];
  const lastSum = last ? summarize(last) : null;
  const add = () => {
    const a = createAccount(idx, name);
    setName('');
    setAdding(false);
    onChanged();
    onPick(a.id);
  };
  return (
    <div class="launcher-body">
      <div class="tagline">{idx.accounts.length ? '選擇帳號' : '永晝水晶碎裂，暮影籠罩大陸。先建立一個帳號，開始你的冒險。'}</div>
      {lastSum && (
        <button class="btn primary lg launcher-continue" onClick={onPlayLast}>
          ▶ 繼續上次的角色：{lastSum.name}（Lv.{lastSum.level} {className(lastSum.classId, lastSum.advId)}）
        </button>
      )}
      <div class="acc-list">
        {idx.accounts.map(a => (
          <div class="acc-card panel" onClick={() => onPick(a.id)}>
            <div class="acc-name">{a.name}</div>
            {a.slots.map((k, i) => {
              const sm = k ? summarize(k) : null;
              return <div class="acc-slot small">{sm ? <>角色 {i + 1}：<b>{sm.name}</b> Lv.{sm.level} {className(sm.classId, sm.advId)}</> : <span class="dim">角色 {i + 1}：空位</span>}</div>;
            })}
          </div>
        ))}
        {adding ? (
          <div class="acc-card panel acc-new">
            <div class="acc-name">新帳號</div>
            <input class="input" maxLength={12} placeholder="帳號名稱（例如：主帳、小明）" value={name} onInput={e => setName((e.target as HTMLInputElement).value)} onKeyDown={e => { if (e.key === 'Enter') add(); }} autoFocus />
            <div class="row" style={{ gap: '6px', marginTop: '8px', justifyContent: 'center' }}>
              <button class="btn primary sm" onClick={add}>建立帳號</button>
              {idx.accounts.length > 0 && <button class="btn ghost sm" onClick={() => setAdding(false)}>取消</button>}
            </div>
          </div>
        ) : (
          <div class="acc-card panel acc-new" onClick={() => setAdding(true)}>
            <div class="acc-plus">＋</div>
            <div>以新帳號開始</div>
          </div>
        )}
      </div>
    </div>
  );
}

function AccountView({ idx, acc, onBack, onPlay, onCreate, onImport, onChanged }: {
  idx: AccountIndex; acc: Account; onBack: () => void; onPlay: (slot: number) => void; onCreate: (slot: number) => void; onImport: (slot: number) => void; onChanged: () => void;
}) {
  const [renaming, setRenaming] = useState(false);
  const [name, setName] = useState(acc.name);
  return (
    <div class="launcher-body">
      <div class="acc-head">
        <button class="btn ghost sm" onClick={onBack}>← 所有帳號</button>
        {renaming ? (
          <span class="row" style={{ gap: '6px' }}>
            <input class="input" maxLength={12} value={name} onInput={e => setName((e.target as HTMLInputElement).value)} />
            <button class="btn sm primary" onClick={() => { renameAccount(idx, acc.id, name); setRenaming(false); onChanged(); }}>確定</button>
          </span>
        ) : <span class="acc-title">{acc.name}</span>}
        <span class="row" style={{ gap: '6px' }}>
          {!renaming && <button class="btn ghost xs" onClick={() => setRenaming(true)}>改名</button>}
          <button class="btn ghost xs danger" onClick={() => confirmModal(`刪除帳號「${acc.name}」？`, <p>帳號底下所有角色的進度都會永久消失，無法復原。</p>, () => { deleteAccount(idx, acc.id); onChanged(); onBack(); }, '永久刪除', true)}>刪除帳號</button>
        </span>
      </div>
      <div class="char-slots">
        {acc.slots.map((key, i) => {
          const sm = key ? summarize(key) : null;
          if (!sm) {
            return (
              <div class="char-slot panel empty">
                <div class="acc-plus">＋</div>
                <div class="small muted">角色 {i + 1}：空位</div>
                <button class="btn primary" onClick={() => onCreate(i)}>建立新角色</button>
                <button class="btn ghost sm" onClick={() => onImport(i)}>匯入存檔（JSON）</button>
              </div>
            );
          }
          const c = CLASSES[sm.classId];
          const top = sm.best.reduce((d, b, k) => (b >= 0 ? k : d), 0);
          const stage = Math.max(0, sm.best[top] ?? -1) + 1;
          return (
            <div class="char-slot panel" onClick={() => onPlay(i)}>
              <HeroPreview look={c.look} art={[sm.advId, sm.classId]} size={150} attackEvery={2.2} />
              <div class="cn">{sm.name}</div>
              <div class="small">Lv.{sm.level}・{className(sm.classId, sm.advId)}{sm.rebirths ? `・轉生 ${sm.rebirths}` : ''}</div>
              <div class="small muted">最遠：{DIFFICULTIES[top].name} 第 {Math.floor((stage - 1) / 10) + 1} 區 {((stage - 1) % 10) + 1} 關</div>
              <div class="tiny dim">上次遊玩：{sm.lastSeen ? `${fmtDuration(Math.max(0, Date.now() - sm.lastSeen))}前` : '—'}</div>
              <div class="row" style={{ gap: '6px', justifyContent: 'center', marginTop: '8px' }}>
                <button class="btn primary" onClick={e => { e.stopPropagation(); onPlay(i); }}>開始</button>
                <button class="btn ghost xs danger" onClick={e => { e.stopPropagation(); confirmModal(`刪除角色「${sm.name}」？`, <p>這個角色的所有進度會永久消失，無法復原。</p>, () => { deleteChar(idx, acc.id, i); onChanged(); }, '永久刪除', true); }}>刪除</button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function className(classId: string, advId: string | null) {
  const c = CLASSES[classId as keyof typeof CLASSES];
  const adv = advId ? ADVANCES[advId as keyof typeof ADVANCES] : null;
  return adv?.name ?? c?.name ?? '';
}
