/* Read Aloud service worker: makes the app installable, work offline, and update itself */
const SHELL = "ra-shell-v6", LIBS = "ra-libs-v1";
const FILES = ["./", "./index.html", "./manifest.json", "./icon-192.png", "./icon-512.png", "./apple-touch-icon.png"];
self.addEventListener("install", e => { e.waitUntil(caches.open(SHELL).then(c => c.addAll(FILES)).then(() => self.skipWaiting())); });
self.addEventListener("activate", e => {
  e.waitUntil(caches.keys().then(ks => Promise.all(ks.filter(k => k.startsWith("ra-shell-") && k !== SHELL).map(k => caches.delete(k)))).then(() => self.clients.claim()));
});
const CDN = /(^|\.)(cdn\.jsdelivr\.net|unpkg\.com|esm\.sh)$/;
self.addEventListener("fetch", e => {
  const req = e.request; if (req.method !== "GET") return;
  const url = new URL(req.url);
  if (url.origin === location.origin) {
    // App files: always try the newest version first (so new uploads show up), fall back to saved copy offline
    e.respondWith(fetch(req, { cache: "no-store" }).then(r => {
      if (r.ok) { const copy = r.clone(); caches.open(SHELL).then(c => c.put(req, copy)); }
      return r;
    }).catch(async () => (await caches.match(req, { ignoreSearch: true })) || caches.match("./index.html")));
  } else if (CDN.test(url.hostname)) {
    // Libraries (reader, scanner, voice engine): versions are pinned, so keep a copy forever → works offline
    e.respondWith(caches.open(LIBS).then(async c => {
      const hit = await c.match(req); if (hit) return hit;
      const r = await fetch(req); if (r.ok || r.type === "opaque") c.put(req, r.clone()).catch(() => {});
      return r;
    }));
  }
});
