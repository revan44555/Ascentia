"use strict";
/**
 * Core — uygulamanın küçük, ekrandan bağımsız çekirdeği.
 *
 * Kural: ekranlar (view-*.js) ve depolama (storage.js) birbirini DEĞİL, yalnızca Core'u bilir.
 * Yeni bir özellik eklemek için mevcut dosyalara dokunmak gerekmez; yeni dosya kendini kaydeder:
 *
 *   Core.route("/risk", { nav: "/risk", view: () => "<section>…</section>" });
 *   Core.nav({ path: "/risk", label: "Risk", order: 25, side: "<path …/>", bottom: "<path …/>" });
 *   Core.action("risk-calc", el => { … Core.emit("view:refresh"); });
 *   Core.on("trade:saved", trade => { … });
 *
 * Yüklenme sırası: core.js ilk dosyadır. Kayıt işlemleri dosyaların üst düzeyinde yapılır.
 */
const Core = (() => {
  const routes = [],
    actions = Object.create(null),
    clicks = [],
    listeners = { input: [], change: [], keydown: [] },
    navItems = [],
    slots = Object.create(null),
    bus = Object.create(null);

  /* ---- olaylar: ekranlar ve depolama arasındaki tek haberleşme yolu ---- */
  function on(name, fn) {
    (bus[name] || (bus[name] = [])).push(fn);
  }
  /** Bir işleyicinin hatası diğerlerini ve uygulamayı durdurmaz. */
  function emit(name, data) {
    for (const fn of bus[name] || []) {
      try {
        fn(data);
      } catch (e) {
        console.error("[Core] '" + name + "' işleyicisi hata verdi:", e);
      }
    }
  }

  /** Ekranı yeniden çizdirmek için tek yol (çizimi kim yaptığını ekran bilmez). */
  const refresh = () => emit("view:refresh");
  const safeDecode = s => {
    try {
      return decodeURIComponent(s);
    } catch (e) {
      return s;
    }
  };

  /* ---- yönlendirme ---- */
  /**
   * "/trades/:id" biçiminde desen kaydeder. Önce kaydedilen önce denenir; "/" yalnız tam eşleşir.
   * def: { view(ctx) → html, nav?: menüde işaretlenecek yol, enter?(ctx): görünüm çizilmeden önce }
   * ctx: { path, params (sorgu dizgesi), args (desen parçaları) }
   */
  function route(pattern, def) {
    if (routes.some(r => r.pattern === pattern)) throw new Error("Yol iki kez kayıtlı: " + pattern);
    const keys = [];
    const re = new RegExp(
      "^" + pattern.replace(/:([a-z]+)/gi, (_, k) => (keys.push(k), "([^/]+)")) + "$"
    );
    routes.push({ pattern, re, keys, def });
  }
  function resolve(path) {
    for (const r of routes) {
      const m = r.re.exec(path);
      if (!m) continue;
      const args = {};
      r.keys.forEach((k, i) => (args[k] = safeDecode(m[i + 1])));
      return { def: r.def, args };
    }
    return null;
  }

  /* ---- tıklama: data-act="<ad>" ve özel data-* öznitelikleri ---- */
  function action(name, fn) {
    if (actions[name]) throw new Error("Eylem iki kez kayıtlı: " + name);
    actions[name] = fn;
  }
  /** Sıra önemli: ilk eşleşen çalışır; when sağlanmazsa sıradaki girişe geçilir. */
  function click(attr, def) {
    clicks.push({ attr, when: def.when, run: def.run });
  }
  function clickSelector() {
    return ["[data-act]", ...clicks.map(c => `[data-${c.attr}]`)].join(",");
  }
  function dispatchClick(el) {
    for (const { attr, when, run } of clicks) {
      if (el.dataset[attr] === undefined) continue;
      if (when && !when(el)) continue;
      run(el);
      return;
    }
    const fn = actions[el.dataset.act];
    if (fn) fn(el);
  }

  /* ---- input / change / keydown: işleyici true dönerse olay işlenmiş sayılır ---- */
  function listen(type, fn) {
    listeners[type].push(fn);
  }
  function dispatch(type, e) {
    for (const fn of listeners[type]) {
      let handled = false;
      try {
        handled = fn(e);
      } catch (err) {
        console.error("[Core] '" + type + "' işleyicisi hata verdi:", err);
      }
      if (handled) return;
    }
  }

  /* ---- slotlar: bir ekrandaki adlandırılmış boş yuvalar ---- */
  /**
   * Ekran dosyası yuvayı BİR KEZ açar:      ${Core.fill("home.cards", { trades })}
   * Özellik dosyası yuvaya kendini bağlar:  Core.slot("home.cards", ctx => "<div class=card>…</div>")
   * fn, ekranın verdiği ctx ile çağrılır ve HTML döner. order küçük olan önce gelir (varsayılan 100).
   * Hatalı bir slot yalnız kendini kaybeder, ekran çizilmeye devam eder.
   */
  function slot(name, fn, opts) {
    const list = slots[name] || (slots[name] = []);
    list.push({ fn, order: (opts && opts.order) ?? 100, n: list.length });
    list.sort((a, b) => a.order - b.order || a.n - b.n);
  }
  function fill(name, ctx) {
    return (slots[name] || [])
      .map(s => {
        try {
          const html = s.fn(ctx);
          return html == null ? "" : String(html);
        } catch (e) {
          console.error("[Core] '" + name + "' slotu hata verdi:", e);
          return "";
        }
      })
      .join("");
  }

  /* ---- menü ---- */
  /** { path, label, order, side, bottom, cls? } — side/bottom: svg içeriği (iç etiketler). */
  function nav(item) {
    navItems.push(item);
    navItems.sort((a, b) => (a.order || 0) - (b.order || 0));
  }
  const svg = (size, sw, inner) =>
    `<svg width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="${sw}" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${inner}</svg>`;
  function navHtml(kind) {
    return navItems
      .map(n =>
        kind === "side"
          ? `<a href="#${n.path}" data-r="${n.path}">${svg(18, 1.75, n.side)}${n.label}</a>`
          : `<a href="#${n.path}" data-r="${n.path}"${n.cls ? ` class="${n.cls}"` : ""}><span class="ic">${svg(25, 1.8, n.bottom)}</span>${n.label}</a>`
      )
      .join("");
  }

  return {
    on,
    emit,
    refresh,
    route,
    resolve,
    action,
    click,
    clickSelector,
    dispatchClick,
    listen,
    dispatch,
    nav,
    navHtml,
    slot,
    fill,
    actions,
    clicks,
  };
})();
