"use strict";
/**
 * Açılış ve ekran çizimi. Yeni özellik için BU dosyaya dokunma:
 * yeni bir js/view-*.js dosyası aç, Core.route / Core.nav / Core.action ile kendini kaydet
 * (bkz. docs/ARCHITECTURE.md).
 */
function parseHash() {
  const h = location.hash.slice(1) || "/",
    q = h.split("?");
  const path = q[0] || "/";
  const params = {};
  if (q[1])
    q[1].split("&").forEach(p => {
      const [k, v] = p.split("=");
      params[dec(k)] = dec(v || "");
    });
  return { path, params };
}
let lastPath = null;

function render() {
  const { path, params } = parseHash();
  const view = $("#view");
  const hit = Core.resolve(path);
  const { def, args } = hit || Core.resolve("/"); // bilinmeyen yol → ana ekran
  const ctx = { path, params, args };
  const navPath = hit ? def.nav || path : null;
  document
    .querySelectorAll("[data-r]")
    .forEach(a => a.classList.toggle("on", a.getAttribute("data-r") === navPath));
  if (def.enter) def.enter(ctx);
  view.innerHTML = def.view(ctx);
  view.classList.remove("enter");
  void view.offsetWidth;
  [...view.querySelectorAll(".card,.empty-hero>*")].forEach((el, i) =>
    el.style.setProperty("--i", i)
  );
  [...view.querySelectorAll(".heat .c")].forEach((el, i) => el.style.setProperty("--d", i));
  view.classList.add("enter");
  if (lastPath !== path) {
    window.scrollTo(0, 0);
    lastPath = path;
  }
}
// Ekranlar ve depolama render()'ı doğrudan çağırmaz; olay yayar.
Core.on("data:changed", render);
Core.on("view:refresh", render);

/** Tek bir dinleyici (olay temsili) tıklamayı kayıtlı işleyiciye yönlendirir. */
const CLICK_SELECTOR = Core.clickSelector();
const viewEl = document.getElementById("view");
viewEl.addEventListener("click", e => {
  const el = e.target.closest(CLICK_SELECTOR);
  if (el) Core.dispatchClick(el);
});
["input", "change", "keydown"].forEach(type =>
  viewEl.addEventListener(type, e => {
    if (e.target.dataset) Core.dispatch(type, e);
  })
);

window.addEventListener("hashchange", () => {
  Core.emit("navigate", location.hash);
  render();
});

// sekmeler arası senkron etiketleri de kapsar
window.addEventListener("storage", e => {
  if (e.key !== "tj_ts") return;
  (async () => {
    applyStores(await readStores());
    render();
  })();
});

$("#sideNav").innerHTML = Core.navHtml("side");
$("#bottomNav").innerHTML = Core.navHtml("bottom");

(async () => {
  await loadAll();
  await fileInit();
  render();
})();
// PWA — yüklenebilirlik + çevrimdışı (yalnızca gerçek tarayıcıda)
if ("serviceWorker" in navigator && /^https?:$/.test(location.protocol || ""))
  window.addEventListener("load", () => {
    navigator.serviceWorker.register("sw.js").catch(() => {});
  });
