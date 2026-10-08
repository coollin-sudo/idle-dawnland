import type { ComponentChildren } from 'preact';
import { artUrl } from '@/render/images';

/** 介面文字裡的 emoji → 美術小圖示（public/art/ 底下的路徑，不含副檔名）；沒有對應的 emoji 照原樣顯示 */
const MAP: Record<string, string> = {
  // 沿用既有的分頁、貨幣圖示
  '🌌': 'ui/rebirth', '🎒': 'ui/bag', '📜': 'ui/quests', '🐾': 'ui/pets', '🗼': 'ui/challenge', '📖': 'ui/collection',
  '⚒': 'ui/forge', '🌳': 'ui/talents', '🗺': 'ui/map', '🛒': 'ui/shop', '🧝': 'ui/hero', '⚙': 'ui/settings',
  '🥚': 'currency/egg0', '💎': 'currency/gems', '💠': 'gems/pouch', '🔷': 'currency/gems', '🍖': 'currency/petFood',
  '🧪': 'currency/potion0', '💰': 'currency/gold',
  // 專用小圖示
  '🌟': 'emo/star', '⭐': 'emo/star', '🔒': 'emo/lock', '🔓': 'emo/unlock', '♻': 'emo/salvage', '🔄': 'emo/reroll', '🔁': 'emo/reroll',
  '🎁': 'emo/chest', '🏆': 'emo/trophy', '✨': 'emo/sparkles', '🐣': 'emo/hatch', '✅': 'emo/check', '🎲': 'emo/dice', '👑': 'emo/crown',
  '📅': 'emo/calendar', '🏛': 'emo/temple', '⚔': 'emo/swords', '📸': 'emo/camera', '⏩': 'emo/fastforward', '🔇': 'emo/mute',
  '🔊': 'emo/sound', '🌙': 'emo/moon', '📊': 'emo/chart', '💾': 'emo/save', '📋': 'emo/clipboard', '💪': 'emo/strength',
  '📦': 'emo/crate', '💔': 'emo/brokenheart', '↩': 'emo/back', '🔥': 'emo/fire', '⏱': 'emo/stopwatch', '🔮': 'emo/crystalball',
  '💀': 'emo/skull', '📈': 'emo/rising', '💥': 'emo/explosion', '♾': 'emo/infinity', '❤': 'emo/heart', '📘': 'emo/tome',
  '🍀': 'emo/clover', '💨': 'emo/wind', '🎯': 'emo/target', '⏳': 'emo/hourglass', '🌀': 'emo/swirl', '🔨': 'emo/hammer',
  '🛡': 'emo/shield', '⚡': 'emo/bolt', '⚠': 'emo/warn',
};

const esc = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
const RE = new RegExp('(' + Object.keys(MAP).sort((a, b) => b.length - a.length).map(esc).join('|') + ')️?', 'gu');

/** 單一 emoji：有美術圖就畫圖，否則顯示 emoji 本身 */
export function Emo({ e, size }: { e: string; size?: number }) {
  const path = MAP[e.replace(/️/g, '')];
  const url = path ? artUrl(`art/${path}`) : null;
  if (!url) return <>{e}</>;
  return <img class="emo" src={url} alt={e} draggable={false} style={size ? { width: size + 'px', height: size + 'px' } : undefined} />;
}

/** 把字串裡有對應美術圖的 emoji 換成小圖示 */
export function rich(text: string | null | undefined): ComponentChildren {
  if (!text) return text;
  const out: ComponentChildren[] = [];
  let last = 0;
  for (const m of text.matchAll(RE)) {
    const url = artUrl(`art/${MAP[m[1]]}`);
    if (!url) continue;
    if (m.index! > last) out.push(text.slice(last, m.index));
    out.push(<img class="emo" src={url} alt={m[0]} draggable={false} />);
    last = m.index! + m[0].length;
  }
  if (last === 0) return text;
  if (last < text.length) out.push(text.slice(last));
  return out;
}

/** 星等：n 顆亮、max - n 顆暗；沒有星星美術圖時用 ★☆ */
export function Stars({ n, max }: { n: number; max: number }) {
  const url = artUrl('art/emo/star');
  if (!url) return <>{'★'.repeat(n)}{'☆'.repeat(Math.max(0, max - n))}</>;
  return <span class="stars-art">{Array.from({ length: max }, (_, i) => <img class={i < n ? '' : 'off'} src={url} alt="" />)}</span>;
}
