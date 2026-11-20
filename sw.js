/* Ascentia service worker — uygulama kabuğunu önbelleğe alır, çevrimdışı açılış sağlar.
 *
 * ASSET_HASH, ASSETS'teki dosyaların içeriğinden `npm run stamp` ile üretilir; dosyalardan biri
 * değişip stamp çalıştırılmazsa `npm test` kırılır. Önbellek adı hash'ten türer: içerik değişince ad
 * değişir, eski önbellek silinir, ve sayfa ile betikleri HER ZAMAN aynı sürümden gelir
 * (eskiden eski/yeni dosyalar karışabiliyordu). */
const ASSET_HASH = "82d9ef065d17";
const CACHE = "ascentia-" + ASSET_HASH;
const ASSETS = [
  "./",
  "./index.html",
  "./manifest.json",
  "./css/style.css",
  "./icon-192.png",
  "./icon-512.png",
  "./icon-maskable-512.png",
  "./js/core.js",
  "./js/utils.js",
  "./js/calc.js",
  "./js/storage.js",
  "./js/symbols.js",
  "./js/services.js",
  "./js/ui.js",
  "./js/view-home.js",
  "./js/view-add.js",
  "./js/view-insights.js",
  "./js/view-more.js",
  "./js/app.js",
];
self.addEventListener("install", e => {
  e.waitUntil(
    caches
      .open(CACHE)
      .then(c => c.addAll(ASSETS))
      .then(() => self.skipWaiting())
  );
});
self.addEventListener("activate", e => {
  e.waitUntil(
    caches
      .keys()
      .then(ks => Promise.all(ks.filter(k => k !== CACHE).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});
self.addEventListener("fetch", e => {
  if (e.request.method !== "GET") return;
  const url = new URL(e.request.url);
  if (url.origin !== self.location.origin) return;
  // Önce bu sürümün önbelleği: sayfa, betikler ve stiller aynı sürümden gelir. Yeni sürüm, tarayıcı
  // sw.js'in değiştiğini görüp yeni önbelleği kurunca devreye girer (uygulama "Yenile" önerir).
  const key = e.request.mode === "navigate" ? "./index.html" : e.request;
  e.respondWith(
    caches
      .open(CACHE)
      .then(c => c.match(key))
      .then(
        hit =>
          hit ||
          fetch(e.request).then(r => {
            if (r.ok && e.request.mode !== "navigate") {
              const cp = r.clone();
              caches.open(CACHE).then(c => c.put(e.request, cp));
            }
            return r;
          })
      )
      .catch(() => caches.open(CACHE).then(c => c.match("./index.html")))
  );
});
