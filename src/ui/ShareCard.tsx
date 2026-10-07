import { useState } from 'preact/hooks';
import { fmt, fmtDuration } from '@/core/format';
import { ADVANCES, CLASSES } from '@/data/classes';
import { DIFFICULTIES } from '@/core/formulas';
import { regionOfStage } from '@/data/regions';
import { paintHero, restPose } from '@/render/heroPainter';
import { Background } from '@/render/background';
import { classImage } from '@/render/images';
import { combatPower, heroStats } from '@/systems/hero';
import { g } from './store';
import { heroLookOf } from './GameScreen';
import { Modal } from './common';
import { closeModal, openModal } from './store';

/** 產生一張可分享的角色卡（PNG） */
export function renderShareCard(): HTMLCanvasElement {
  const s = g().state;
  const W = 1080, H = 1350;
  const c = document.createElement('canvas');
  c.width = W; c.height = H;
  const ctx = c.getContext('2d')!;
  const best = Math.max(0, s.progress.best[0]);
  const region = regionOfStage(best);
  // 背景：目前區域的場景
  const bg = new Background(region.bg, 7);
  ctx.save();
  const sc = 900 / 420;
  ctx.translate(-(960 * sc - W) / 2, 0);
  ctx.scale(sc, sc);
  bg.draw(ctx, 300, 0);
  ctx.restore();
  const grd = ctx.createLinearGradient(0, 0, 0, H);
  grd.addColorStop(0, 'rgba(10,12,19,0.1)');
  grd.addColorStop(0.42, 'rgba(10,12,19,0.35)');
  grd.addColorStop(0.62, 'rgba(10,12,19,0.95)');
  grd.addColorStop(1, '#0a0c13');
  ctx.fillStyle = grd;
  ctx.fillRect(0, 0, W, H);
  // 英雄
  ctx.save();
  const art = (s.hero.advId ? classImage(s.hero.advId) : null) ?? classImage(s.hero.classId);
  if (art) {
    const h = 620, w = Math.min(820, (art.width / art.height) * h), hh = (art.height / art.width) * w;
    ctx.drawImage(art, W / 2 - w / 2, 790 - hh, w, hh);
  } else {
    ctx.translate(W / 2, 760);
    ctx.scale(4.2, 4.2);
    paintHero(ctx, heroLookOf(), restPose(0.6));
  }
  ctx.restore();
  // 文字
  const cls = s.hero.advId ? ADVANCES[s.hero.advId].name : CLASSES[s.hero.classId].name;
  ctx.textAlign = 'center';
  ctx.fillStyle = '#ffe39a';
  ctx.font = '900 46px "Noto Sans TC", system-ui, sans-serif';
  ctx.fillText('放置冒險：晨曦大陸', W / 2, 90);
  ctx.fillStyle = '#ffffff';
  ctx.font = '900 76px "Noto Sans TC", system-ui, sans-serif';
  ctx.fillText(s.hero.name, W / 2, 860);
  ctx.fillStyle = '#f0c25a';
  ctx.font = '700 40px "Noto Sans TC", system-ui, sans-serif';
  ctx.fillText(`Lv.${s.hero.level} ${cls}${s.rebirth.count ? `・轉生 ${s.rebirth.count}` : ''}`, W / 2, 920);
  const st = heroStats(s);
  const diff = s.progress.unlockedDifficulty;
  const stats: [string, string][] = [
    ['戰力', fmt(combatPower(s, st))],
    ['最遠進度', `${DIFFICULTIES[diff].name} ${Math.floor(Math.max(0, s.progress.best[diff]) / 10) + 1}-${(Math.max(0, s.progress.best[diff]) % 10) + 1}`],
    ['無盡之塔', `${s.tower.best} 層`],
    ['傳說裝備', `${s.uniquesFound.length} 件`],
    ['寵物', `${Object.keys(s.pets.owned).length} 隻`],
    ['遊玩時間', fmtDuration(s.playMs)],
  ];
  stats.forEach(([k, v], i) => {
    const x = i % 2 === 0 ? W * 0.27 : W * 0.73;
    const y = 1020 + Math.floor(i / 2) * 100;
    ctx.fillStyle = '#8f99b3';
    ctx.font = '700 28px "Noto Sans TC", system-ui, sans-serif';
    ctx.fillText(k, x, y);
    ctx.fillStyle = '#ffffff';
    ctx.font = '900 42px "Noto Sans TC", system-ui, sans-serif';
    ctx.fillText(v, x, y + 48);
  });
  ctx.fillStyle = '#5f6884';
  ctx.font = '600 26px "Noto Sans TC", system-ui, sans-serif';
  ctx.fillText(location.origin + location.pathname, W / 2, H - 40);
  return c;
}

function ShareBody() {
  const [url] = useState(() => renderShareCard().toDataURL('image/png'));
  const share = async () => {
    const blob = await (await fetch(url)).blob();
    const file = new File([blob], 'dawnland.png', { type: 'image/png' });
    const nav = navigator as Navigator & { canShare?: (d: ShareData) => boolean };
    if (nav.share && nav.canShare?.({ files: [file] })) {
      try { await nav.share({ files: [file], title: '放置冒險：晨曦大陸', text: '來跟我一起冒險！' }); } catch { /* 使用者取消 */ }
    } else {
      const a = document.createElement('a');
      a.href = url;
      a.download = 'dawnland.png';
      a.click();
    }
  };
  return (
    <Modal title="分享我的角色" actions={<>
      <button class="btn" onClick={closeModal}>關閉</button>
      <button class="btn primary" onClick={() => void share()}>分享／下載</button>
    </>}>
      <img src={url} style={{ width: '100%', borderRadius: '12px' }} alt="角色卡" />
    </Modal>
  );
}

export function ShareCardButton() {
  return <button class="btn primary" onClick={() => openModal(() => <ShareBody />)}>📸 產生角色分享卡</button>;
}
