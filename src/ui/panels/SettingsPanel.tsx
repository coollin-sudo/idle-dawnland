import { useState } from 'preact/hooks';
import { setNumberStyle, fmtDuration } from '@/core/format';
import type { Settings } from '@/core/types';
import { RARITIES } from '@/data/items';
import { audio } from '@/audio/audio';
import { setArtEnabled } from '@/render/images';
import { clearState, exportJson, importText, saveState } from '@/save/storage';
import { Modal, Switch, confirmModal } from '../common';
import { closeModal, g, openModal, refresh, saveNow, startGame, stopGame, game, uiTick } from '../store';

export function SettingsPanel() {
  void uiTick.value;
  const gm = g();
  const st = gm.state.settings;
  const set = <K extends keyof Settings>(k: K, v: Settings[K]) => {
    st[k] = v;
    if (k === 'sfx' || k === 'music') audio.setVolumes(st.sfx, st.music);
    if (k === 'numberStyle') setNumberStyle(st.numberStyle);
    if (k === 'useArt') setArtEnabled(st.useArt);
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
      {row('美術圖', '角色、背景與圖示使用手繪美術圖；關閉後改用程式繪製（角色會隨裝備改變武器外觀）', <Switch on={st.useArt} onChange={v => set('useArt', v)} />)}
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
      {row('自動裝備更好的裝備', '換裝時會把舊裝備上的魔晶搬到新裝備', <Switch on={st.autoEquip} onChange={v => set('autoEquip', v)} />)}
      {row('自動裝備傳說與套裝', '開啟後傳說、套裝也會自動換上；關閉時也不會自動換掉身上的傳說與套裝', <Switch on={st.autoEquipSpecial} onChange={v => set('autoEquipSpecial', v)} />)}
      {row('自動分解', '掉落時直接分解這個稀有度以下的裝備', (
        <select class="input" value={st.autoSalvage} onChange={e => set('autoSalvage', +(e.target as HTMLSelectElement).value)}>
          <option value={-1}>關閉</option>
          {[0, 1, 2, 3].map(r => <option value={r}>{RARITIES[r].name}{r ? '以下' : ''}</option>)}
        </select>
      ))}
      {row('保留更好的裝備', '比身上好的裝備不會被自動分解', <Switch on={st.keepUpgrades} onChange={v => set('keepUpgrades', v)} />)}
      {row('自動挑戰首領', '首領失敗後刷幾關會自動再挑戰', <Switch on={st.autoBoss} onChange={v => set('autoBoss', v)} />)}

      <h3>存檔</h3>
      <div class="small muted" style={{ marginBottom: '8px' }}>進度每 15 秒自動存在這個瀏覽器。換裝置或備份時，匯出成 JSON 檔再到另一台匯入。已遊玩 {fmtDuration(gm.state.playMs)}。</div>
      <div class="row wrap" style={{ gap: '6px' }}>
        <button class="btn sm" onClick={() => { saveNow(); gm.toast('已存檔', 'good', '💾'); }}>立即存檔</button>
        <button class="btn sm" onClick={() => downloadSave()}>匯出存檔（JSON）</button>
        <button class="btn sm" onClick={() => openImport()}>匯入存檔</button>
        <button class="btn sm danger" onClick={() => confirmModal('刪除角色？', <p>{gm.state.hero.name} 的所有進度會永久消失，無法復原。</p>, () => { stopGame(); clearState(); game.value = null; location.reload(); }, '永久刪除', true)}>刪除角色</button>
      </div>

      <h3>關於</h3>
      <div class="small muted">
        放置冒險：晨曦大陸 v2・原創網頁放置 RPG。角色、怪物、特效與音樂皆為程式即時生成。
      </div>
    </div>
  );
}

/** 把目前進度下載成 JSON 檔 */
function downloadSave() {
  const gm = g();
  saveNow();
  const { filename, blob } = exportJson(gm.state);
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 10_000);
  gm.toast(`已匯出 ${filename}`, 'good', '💾');
}

function ImportBody() {
  void uiTick.value;
  const [text, setText] = useState('');
  const [err, setErr] = useState('');
  const load = async (raw: string) => {
    const s = await importText(raw);
    if (!s) { setErr('無法讀取這個存檔，請確認是晨曦大陸匯出的 JSON 檔'); return; }
    stopGame();
    saveState(s);
    closeModal();
    startGame(s);
    refresh();
  };
  const pickFile = (e: Event) => {
    const f = (e.target as HTMLInputElement).files?.[0];
    if (!f) return;
    setErr('');
    void f.text().then(load);
  };
  return (
    <Modal title="匯入存檔" actions={<>
      <button class="btn" onClick={closeModal}>取消</button>
      {text.trim() && <button class="btn primary" onClick={() => void load(text)}>匯入貼上的內容</button>}
    </>}>
      <p class="small muted">會覆蓋這個瀏覽器目前的角色。</p>
      <label class="btn primary" style={{ display: 'inline-block', cursor: 'pointer' }}>
        選擇存檔檔案（.json）
        <input type="file" accept=".json,application/json" style={{ display: 'none' }} onChange={pickFile} />
      </label>
      <details style={{ marginTop: '10px' }}>
        <summary class="small muted">或貼上 JSON 內容／舊版存檔碼</summary>
        <textarea class="input" placeholder="貼上 JSON 內容，或 DZ1: 開頭的舊存檔碼" value={text} onInput={e => setText((e.target as HTMLTextAreaElement).value)} />
      </details>
      {err && <div class="bad small">{err}</div>}
    </Modal>
  );
}

export function openImport() {
  openModal(() => <ImportBody />);
}
