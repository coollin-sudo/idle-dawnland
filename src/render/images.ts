/** 可選的外部美術圖：有圖就用圖，沒有就用程式繪製 */
const cache = new Map<string, HTMLImageElement | null>();
const loading = new Set<string>();

export function getImage(path: string): HTMLImageElement | null {
  if (cache.has(path)) return cache.get(path)!;
  if (!loading.has(path) && typeof Image !== 'undefined') {
    loading.add(path);
    const img = new Image();
    img.onload = () => cache.set(path, img);
    img.onerror = () => cache.set(path, null);
    img.src = import.meta.env.BASE_URL + path;
  }
  return null;
}

export const classImage = (classId: string) => getImage(`assets/classes/${classId}.png`);
export const monsterImage = (id: string) => getImage(`assets/monsters/${id}.png`);
export const petImage = (id: string) => getImage(`assets/pets/${id}.png`);
