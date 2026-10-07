import { signal } from '@preact/signals';

/** 可選的外部美術圖：public/art/manifest.json 列出的圖才會載入，沒有就用程式繪製 */
const cache = new Map<string, HTMLImageElement | null>();
let available: Set<string> | null = null;
/** 清單載入或任何圖片載入完成時遞增，讓介面重新繪製 */
export const artVersion = signal(0);
let enabled = true;

export function setArtEnabled(on: boolean) {
  if (on === enabled) return;
  enabled = on;
  artVersion.value++;
}

if (typeof fetch !== 'undefined' && typeof window !== 'undefined') {
  fetch(import.meta.env.BASE_URL + 'art/manifest.json')
    .then(r => (r.ok ? r.json() : []))
    .then((list: string[]) => { available = new Set(list); })
    .catch(() => { available = new Set(); })
    .finally(() => { artVersion.value++; });
}

/** 'art/monsters/slime' → 清單裡實際存在的檔案（優先 webp） */
function resolve(base: string): string | null {
  if (!available) return null;
  for (const ext of ['.webp', '.png', '.jpg']) if (available.has(base + ext)) return base + ext;
  return null;
}

export function getImage(base: string): HTMLImageElement | null {
  if (!enabled) return null;
  const path = resolve(base);
  if (!path) return null;
  if (cache.has(path)) return cache.get(path)!;
  cache.set(path, null);
  const img = new Image();
  img.onload = () => { cache.set(path, img); artVersion.value++; };
  img.src = import.meta.env.BASE_URL + path;
  return null;
}

/** 介面用：有這張圖就回傳網址（讀取 artVersion 以便清單載入後自動更新） */
export function artUrl(base: string): string | null {
  void artVersion.value;
  const path = enabled ? resolve(base) : null;
  return path ? import.meta.env.BASE_URL + path : null;
}

export const classImage = (classId: string) => getImage(`art/classes/${classId}`);
export const monsterImage = (id: string) => getImage(`art/monsters/${id}`);
export const petImage = (id: string) => getImage(`art/pets/${id}`);
export const monsterArt = (id: string) => artUrl(`art/monsters/${id}`);
export const petArt = (id: string) => artUrl(`art/pets/${id}`);
