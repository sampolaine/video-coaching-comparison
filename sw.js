const CACHE = 'vertailu-1ce71d1b5ff8';
const FILES = ['./', './index.html', './manifest.webmanifest', './icon-192.png', './icon-512.png', './apple-touch-icon.png'];
const OWN = new Set(FILES.map((f) => new URL(f, self.registration.scope).href));
self.addEventListener('install', (e) => {
  e.waitUntil(caches.open(CACHE).then((c) => c.addAll(FILES.map((f) => new Request(f, { cache: 'reload' })))).then(() => self.skipWaiting()));
});
self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((k) => k.startsWith('vertailu-') && k !== CACHE).map((k) => caches.delete(k))))
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
    caches.open(CACHE).then((c) =>
      c.match(url.href).then((hit) => {
        const fresh = fetch(url.href, { cache: 'no-cache' })
          .then((res) => { if (res.ok) c.put(url.href, res.clone()); return res; });
        if (hit) { e.waitUntil(fresh.catch(() => {})); return hit; }
        return fresh;
      }),
    ),
  );
});
