// 離線快取：頁面走網路優先（確保拿到新版），其餘靜態檔走快取優先
const CACHE = 'dawnland-v5';
self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', e => {
  e.waitUntil((async () => {
    for (const k of await caches.keys()) if (k !== CACHE) await caches.delete(k);
    await self.clients.claim();
  })());
});
self.addEventListener('fetch', e => {
  const req = e.request;
  if (req.method !== 'GET' || new URL(req.url).origin !== location.origin) return;
  if (req.mode === 'navigate') {
    e.respondWith((async () => {
      try {
        const res = await fetch(req);
        (await caches.open(CACHE)).put(req, res.clone());
        return res;
      } catch {
        return (await caches.match(req)) ?? (await caches.match('./')) ?? Response.error();
      }
    })());
    return;
  }
  e.respondWith((async () => {
    const hit = await caches.match(req).catch(() => null);
    if (hit) return hit;
    const res = await fetch(req);
    // 寫入快取失敗（空間不足、快取正在換版本）不能影響這次的回應
    if (res.ok && !req.url.includes('manifest.json')) {
      const copy = res.clone();
      e.waitUntil(caches.open(CACHE).then(c => c.put(req, copy)).catch(() => {}));
    }
    return res;
  })());
});
