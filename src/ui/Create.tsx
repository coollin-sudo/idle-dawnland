import { useState } from 'preact/hooks';
import { newGameState } from '@/core/state';
import type { ClassId } from '@/core/types';
import { CLASSES, advancesOf } from '@/data/classes';
import { saveState } from '@/save/storage';
import { audio } from '@/audio/audio';
import { HeroPreview } from './HeroPreview';
import { startGame } from './store';
import { artUrl } from '@/render/images';

export function Create({ onDone, onImport }: { onDone: () => void; onImport: () => void }) {
  const [cls, setCls] = useState<ClassId>('warrior');
  const [name, setName] = useState('');
  const start = () => {
    audio.unlock();
    audio.play('levelup');
    const s = newGameState(name.trim() || '無名的守護者', cls);
    saveState(s);
    startGame(s);
    onDone();
  };
  return (
    <div class="create">
      {(() => { const bg = artUrl('art/title/bg'); return bg ? <div class="title-bg" style={{ backgroundImage: `url(${bg})` }} /> : null; })()}
      {(() => { const em = artUrl('art/title/emblem'); return em ? <img class="title-emblem" src={em} alt="" /> : null; })()}
      <div class="logo">放置冒險</div>
      <div class="logo-sub">晨 曦 大 陸</div>
      <div class="tagline">永晝水晶碎裂，暮影籠罩大陸。選擇你的道路，守護者——就算你離開，冒險也會繼續。</div>
      <div class="classes">
        {(Object.keys(CLASSES) as ClassId[]).map(id => {
          const c = CLASSES[id];
          return (
            <div class={'cls panel' + (cls === id ? ' on' : '')} onClick={() => { setCls(id); audio.play('click'); }}>
              <HeroPreview look={c.look} art={[id]} attackEvery={cls === id ? 1.6 : 0} size={180} />
              <div class="cn">{c.name}</div>
              <div class="ct">{c.title}</div>
              <div class="cd">{c.desc}</div>
              <div class="cr">{c.role}</div>
              <div class="small muted" style={{ marginTop: '6px' }}>轉職：{advancesOf(id).map(a => a.name).join(' ／ ')}</div>
            </div>
          );
        })}
      </div>
      <div class="namebox">
        <input class="input" maxLength={12} placeholder="輸入你的名字" value={name} onInput={e => setName((e.target as HTMLInputElement).value)} onKeyDown={e => { if (e.key === 'Enter') start(); }} />
        <button class="btn primary lg" onClick={start}>踏上旅程</button>
      </div>
      <div style={{ marginTop: '18px' }}>
        <button class="btn ghost sm" onClick={onImport}>已有存檔碼？匯入存檔</button>
      </div>
      <div class="small dim" style={{ marginTop: '26px' }}>原創作品・進度保存在你的瀏覽器・建議使用電腦或手機的最新版瀏覽器</div>
    </div>
  );
}
