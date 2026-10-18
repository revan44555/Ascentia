/* Ascentia service worker — uygulama kabugunu onbellege alir, cevrimdisi acilis saglar */
const CACHE="ascentia-v3";
const ASSETS=["./","./index.html","./manifest.json","./css/style.css","./icon-192.png","./icon-512.png","./icon-maskable-512.png","./js/utils.js","./js/calc.js","./js/storage.js","./js/symbols.js","./js/ui.js","./js/view-home.js","./js/view-add.js","./js/view-insights.js","./js/view-more.js","./js/app.js"];
self.addEventListener("install",e=>{e.waitUntil(caches.open(CACHE).then(c=>c.addAll(ASSETS)).then(()=>self.skipWaiting()))});
self.addEventListener("activate",e=>{e.waitUntil(caches.keys().then(ks=>Promise.all(ks.filter(k=>k!==CACHE).map(k=>caches.delete(k)))).then(()=>self.clients.claim()))});
self.addEventListener("fetch",e=>{
if(e.request.method!=="GET")return;
const url=new URL(e.request.url);
if(url.origin!==self.location.origin)return;
if(e.request.mode==="navigate"){e.respondWith(fetch(e.request).then(r=>{const cp=r.clone();caches.open(CACHE).then(c=>c.put("./index.html",cp));return r}).catch(()=>caches.match("./index.html")));return}
e.respondWith(caches.match(e.request).then(hit=>hit||fetch(e.request).then(r=>{if(r.ok){const cp=r.clone();caches.open(CACHE).then(c=>c.put(e.request,cp))}return r})));
});
