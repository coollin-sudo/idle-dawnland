/** 可選的外部美術圖：public/art/manifest.json 列出的圖才會載入，沒有就用程式繪製 */
const cache = new Map<string, HTMLImageElement | null>();
let available: Set<string> | null = null;

if (typeof fetch !== 'undefined' && typeof window !== 'undefined') {
  fetch(import.meta.env.BASE_URL + 'art/manifest.json')
    .then(r => (r.ok ? r.json() : []))
    .then((list: string[]) => { available = new Set(list); })
    .catch(() => { available = new Set(); });
}

export function getImage(path: string): HTMLImageElement | null {
  if (!available || !available.has(path)) return null;
  if (cache.has(path)) return cache.get(path)!;
  cache.set(path, null);
  const img = new Image();
  img.onload = () => cache.set(path, img);
  img.src = import.meta.env.BASE_URL + path;
  return null;
}

export const classImage = (classId: string) => getImage(`art/classes/${classId}.png`);
export const monsterImage = (id: string) => getImage(`art/monsters/${id}.png`);
export const petImage = (id: string) => getImage(`art/pets/${id}.png`);
