import { useEffect, useState } from 'preact/hooks';
import { setNumberStyle, fmtDuration } from '@/core/format';
import type { Settings } from '@/core/types';
import { RARITIES } from '@/data/items';
import { audio } from '@/audio/audio';
import { clearState, exportCode, importCode, saveState } from '@/save/storage';
import { Modal, Switch, confirmModal } from '../common';
import { closeModal, g, openModal, refresh, saveNow, startGame, stopGame, game } from '../store';

export function SettingsPanel() {
  const gm = g();
  const st = gm.state.settings;
  const set = <K extends keyof Settings>(k: K, v: Settings[K]) => {
    st[k] = v;
    if (k === 'sfx' || k === 'music') audio.setVolumes(st.sfx, st.music);
    if (k === 'numberStyle') setNumberStyle(st.numberStyle);
    refresh();
  };
  const row = (label: string, help: string | null, ctl: preact.ComponentChildren) => (
    <div class="setting"><div class="l">{label}{help && <small>{help}</small>}</div>{ctl}</div>
  );
  return (
    <div>
      <h3>音效</h3>
      {row('音效音量', null, <input type="range" min={0} max={1} step={0.05} value={st.sfx} onInput={e => set('sfx', +(e.target as HTMLInputElement).value)} />)}
      {row('音樂音量', '每個區域都有自己的配樂', <input type="range" min={0} max={1} step={0.05} value={st.music} onInput={e => set('music', +(e.target as HTMLInputElement).value)} />)}

      <h3>畫面</h3>
      {row('粒子特效', '裝置較慢時可以調低', (
        <select class="input" value={st.particles} onChange={e => set('particles', (e.target as HTMLSelectElement).value as Settings['particles'])}>
          <option value="high">高</option><option value="low">低</option><option value="off">關閉</option>
        </select>
      ))}
      {row('傷害數字', null, <Switch on={st.dmgNumbers} onChange={v => set('dmgNumbers', v)} />)}
      {row('畫面震動', null, <Switch on={st.shake} onChange={v => set('shake', v)} />)}
      {row('數字格式', null, (
        <select class="input" value={st.numberStyle} onChange={e => set('numberStyle', (e.target as HTMLSelectElement).value as Settings['numberStyle'])}>
          <option value="zh">萬／億</option><option value="short">K／M／B</option><option value="full">完整數字</option>
        </select>
      ))}

      <h3>自動化</h3>
      {row('自動喝藥水', `生命低於 ${st.potionAt}% 時`, <input type="range" min={10} max={90} step={5} value={st.potionAt} onInput={e => set('potionAt', +(e.target as HTMLInputElement).value)} />)}
      {row('自動補充藥水', '藥水用完時用金幣補 10 瓶', <Switch on={st.autoBuyPotions} onChange={v => set('autoBuyPotions', v)} />)}
      {row('自動裝備更好的裝備', '傳說與套裝不會自動換上', <Switch on={st.autoEquip} onChange={v => set('autoEquip', v)} />)}
      {row('自動分解', '掉落時直接分解這個稀有度以下的裝備', (
        <select class="input" value={st.autoSalvage} onChange={e => set('autoSalvage', +(e.target as HTMLSelectElement).value)}>
          <option value={-1}>關閉</option>
          {[0, 1, 2, 3].map(r => <option value={r}>{RARITIES[r].name}{r ? '以下' : ''}</option>)}
        </select>
      ))}
      {row('保留更好的裝備', '比身上好的裝備不會被自動分解', <Switch on={st.keepUpgrades} onChange={v => set('keepUpgrades', v)} />)}
      {row('自動挑戰首領', '首領失敗後刷幾關會自動再挑戰', <Switch on={st.autoBoss} onChange={v => set('autoBoss', v)} />)}

      <h3>存檔</h3>
      <div class="small muted" style={{ marginBottom: '8px' }}>進度每 15 秒自動存在這個瀏覽器。換裝置時用存檔碼轉移。已遊玩 {fmtDuration(gm.state.playMs)}。</div>
      <div class="row wrap" style={{ gap: '6px' }}>
        <button class="btn sm" onClick={() => { saveNow(); gm.toast('已存檔', 'good', '💾'); }}>立即存檔</button>
        <button class="btn sm" onClick={() => openExport()}>匯出存檔碼</button>
        <button class="btn sm" onClick={() => openImport()}>匯入存檔碼</button>
        <button class="btn sm danger" onClick={() => confirmModal('刪除角色？', <p>{gm.state.hero.name} 的所有進度會永久消失，無法復原。</p>, () => { stopGame(); clearState(); game.value = null; location.reload(); }, '永久刪除', true)}>刪除角色</button>
      </div>

      <h3>關於</h3>
      <div class="small muted">
        放置冒險：晨曦大陸 v2・原創網頁放置 RPG。角色、怪物、特效與音樂皆為程式即時生成。
      </div>
    </div>
  );
}

function ExportBody() {
  const [code, setCode] = useState('產生中…');
  useEffect(() => { void exportCode(g().state).then(setCode); }, []);
  return (
    <Modal title="匯出存檔碼" actions={<>
      <button class="btn" onClick={closeModal}>關閉</button>
      <button class="btn primary" onClick={() => { void navigator.clipboard?.writeText(code).then(() => g().toast('已複製', 'good', '📋')); }}>複製</button>
    </>}>
      <p class="small muted">把這段文字存好，在其他裝置選「匯入存檔碼」貼上即可。</p>
      <textarea class="input" readOnly value={code} onFocus={e => (e.target as HTMLTextAreaElement).select()} />
    </Modal>
  );
}

function openExport() {
  openModal(() => <ExportBody />);
}

function ImportBody() {
  const [text, setText] = useState('');
  const [err, setErr] = useState('');
  const go = async () => {
    const s = await importCode(text);
    if (!s) { setErr('存檔碼無效'); return; }
    stopGame();
    saveState(s);
    closeModal();
    startGame(s);
    refresh();
  };
  return (
    <Modal title="匯入存檔碼" actions={<>
      <button class="btn" onClick={closeModal}>取消</button>
      <button class="btn primary" onClick={() => void go()}>匯入</button>
    </>}>
      <p class="small muted">會覆蓋這個瀏覽器目前的角色。</p>
      <textarea class="input" placeholder="貼上存檔碼（DZ1: 開頭）" value={text} onInput={e => setText((e.target as HTMLTextAreaElement).value)} />
      {err && <div class="bad small">{err}</div>}
    </Modal>
  );
}

export function openImport() {
  openModal(() => <ImportBody />);
}
