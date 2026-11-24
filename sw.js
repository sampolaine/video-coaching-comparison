const CACHE = 'vcc-bcda8634c91c';
const FILES = ['./', './index.html', './manifest.webmanifest', './icon-192.png', './icon-512.png', './apple-touch-icon.png'];
const OWN = new Set(FILES.map((f) => new URL(f, self.registration.scope).href));
const PAGE = new Set(['./', './index.html'].map((f) => new URL(f, self.registration.scope).href));
const WAIT_MS = 3000;
self.addEventListener('install', (e) => {
  e.waitUntil(caches.open(CACHE).then((c) => c.addAll(FILES.map((f) => new Request(f, { cache: 'reload' })))).then(() => self.skipWaiting()));
});
self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((k) => (k.startsWith('vcc-') || /^vertailu-[0-9a-f]{12}$/.test(k)) && k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim()),
  );
});
self.addEventListener('fetch', (e) => {
  const req = e.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  url.search = '';
  url.hash = '';
  if (!OWN.has(url.href)) return;
  e.respondWith(
    caches.open(CACHE).then((c) => {
      const fresh = fetch(url.href, { cache: 'no-cache' })
        .then((res) => { if (res.ok) { const copy = res.clone(); e.waitUntil(c.put(url.href, copy)); } return res; });
      if (PAGE.has(url.href) || req.mode === 'navigate') {
        const late = new Promise((ok) => setTimeout(ok, WAIT_MS)).then(() => c.match(url.href)).then((hit) => hit || fresh);
        const quick = fresh.then((res) => (res.ok ? res : c.match(url.href).then((hit) => hit || res)), () => c.match(url.href).then((hit) => hit || Response.error()));
        e.waitUntil(fresh.catch(() => {}));
        return Promise.race([quick, late]);
      }
      return c.match(url.href).then((hit) => {
        if (hit) { e.waitUntil(fresh.catch(() => {})); return hit; }
        return fresh;
      });
    }),
  );
});
