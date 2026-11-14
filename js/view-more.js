"use strict";
function backupStatus() {
  const t = state.lastBackupAt;
  if (!state.trades.length && !t)
    return {
      c: "ok",
      t: "Henüz yedeklenecek işlem yok",
      s: "İlk işlemlerini kaydedince yedek almayı unutma.",
    };
  if (!t)
    return state.trades.length < 5
      ? {
          c: "warn",
          t: "Henüz yedek alınmadı",
          s: "Veriler yalnızca bu cihazda. İstediğinde yedekle.",
        }
      : { c: "bad", t: "Henüz yedek alınmadı", s: "Düzenli yedek al." };
  const d = Math.floor((Date.now() - t) / 864e5);
  return {
    c: d > 7 ? "warn" : "ok",
    t: "Son yedek " + (d < 1 ? "bugün" : d + " gün önce"),
    s: new Date(t).toLocaleString("tr-TR"),
  };
}
function backupNote() {
  return state.lastBackupAt
    ? "Son yedek: " + new Date(state.lastBackupAt).toLocaleDateString("tr-TR") + "."
    : "Hiç yedek almadın.";
}
function pageHead(t, back) {
  return `<header class="page-h">${back ? `<a class="bk" href="#/more">‹ Daha</a>` : `<p class="eyebrow">Ayarlar</p>`}<h1>${t}</h1></header>`;
}
function settingRow(t, d, btn) {
  return `<div class="lrow"><div><div class="lt">${t}</div><div class="subtle ld">${d}</div></div>${btn}</div>`;
}
function lpick(t, d, kind, acc) {
  return settingRow(
    t,
    d,
    `<label class="btn sm secondary" style="cursor:pointer">Seç<input type="file" accept="${acc}" hidden data-file="${kind}"></label>`
  );
}
function viewMore() {
  const bs = backupStatus(),
    nt = TAGKIND.reduce((n, [k]) => n + state.tags[k].length, 0);
  const row = (h, t, v) =>
    `<a class="lrow" href="${h}"><span>${t}</span><span class="lv">${v}<i>›</i></span></span></a>`;
  return `<div class="stack">${pageHead("Daha")}
<div class="card bkc"><div><div class="bkt"><span class="dot ${bs.c}"></span>${bs.t}</div><div class="subtle bks">${bs.s}</div></div><button type="button" class="btn sm primary" data-act="jsonexport">Yedekle</button></div>
<div class="card lgrp">${row("#/more/accounts", "Hesaplar", state.accounts.length + " hesap")}${row("#/more/tags", "Etiketler", nt + " etiket")}${row("#/more/data", "Veri ve yedek", "")}</div>
${INSTALL_PROMPT ? `<div class="card lgrp"><div class="lrow"><span>Uygulama</span><button type="button" class="btn sm primary" data-act="install">Ana ekrana yükle</button></div></div>` : ""}
<div class="card lgrp"><div class="lrow"><span>Görünüm</span><span class="sg"><button type="button" class="${state.theme === "dark" ? "on" : ""}" data-act="theme" data-v="dark">Koyu</button><button type="button" class="${state.theme === "light" ? "on" : ""}" data-act="theme" data-v="light">Açık</button></span></div></div>
<p class="subtle foot">${state.trades.length} işlem · veriler yalnızca bu cihazda</p></div>`;
}

function viewAccounts() {
  return `<div class="stack">${pageHead("Hesaplar", 1)}
<div class="card s3">
${state.accounts
  .map(
    a => `<div class="card" style="padding:12px;background:var(--elevated);box-shadow:none">
<div style="display:flex;justify-content:space-between;align-items:center;gap:8px"><input class="inp" style="height:40px" data-aid="name:${esc(a.id)}" value="${esc(a.name)}" aria-label="Hesap adı">${state.accounts.length > 1 ? `<button type="button" class="btn sm danger" data-act="delacc" data-id="${esc(a.id)}" aria-label="Hesabı sil">Sil</button>` : ""}</div>
<div class="grid2" style="margin-top:8px"><div><label class="fld"><span>Bakiye (${esc(state.prefsCur || "USD")})</span><input class="inp" inputmode="decimal" data-aid="balance:${esc(a.id)}" value="${a.balance || ""}"></label></div>
<div><label class="fld"><span>Para birimi</span><input class="inp" data-aid="cur:${esc(a.id)}" maxlength="3" value="${esc(a.cur || "")}"></label></div></div>
<div class="grid2"><div><label class="fld"><span>Günlük kayıp limiti</span><input class="inp" inputmode="decimal" placeholder="ör. 200" data-aid="dl:${esc(a.id)}" value="${a.dl || ""}"></label></div>
<div><label class="fld"><span>Maks. düşüş (%)</span><input class="inp" inputmode="decimal" placeholder="ör. 6" data-aid="md:${esc(a.id)}" value="${a.md || ""}"></label></div></div>
<div class="rowline" style="padding-bottom:0"><span>Güncel bakiye</span><span class="mono ${pnlClass(currentBalance(a))}">${money(currentBalance(a))}</span></div>
</div>`
  )
  .join("")}
<div class="addrow"><input class="inp" placeholder="Yeni hesap adı" data-newacc="1"><button type="button" class="btn md secondary" data-act="addacc">Ekle</button></div>
<p class="subtle" style="font-size:13px">Bakiye girince risk yüzdesi ve equity eğrisi hesaplanır. Limitler Analiz ekranında izlenir.</p>
</div></div>`;
}
function viewTags() {
  return `<div class="stack">${pageHead("Etiketler", 1)}
${TAGKIND.map(
  ([
    k,
    l,
  ]) => `<div class="card s3"><p class="sect-h">${l}</p>${state.tags[k].length ? `<div class="chips">${state.tags[k].map(x => `<span class="chip off">${esc(x)} <button type="button" data-act="deltag" data-kind="${k}" data-v="${esc(x)}" aria-label="Etiketi sil">✕</button></span>`).join("")}</div>` : `<p class="subtle" style="font-size:14px">Etiket yok.</p>`}
<div class="addrow"><input class="inp" placeholder="Yeni ${l.toLocaleLowerCase("tr-TR")} ekle" data-newtag="${k}"><button type="button" class="btn md secondary" data-act="addtag" data-kind="${k}">Ekle</button></div></div>`
).join("")}
<div class="card s3"><p class="sect-h">Sembol önerileri</p>${state.tags.syms.length ? `<div class="chips">${state.tags.syms.map(x => `<span class="chip off">${esc(x)} <button type="button" data-act="deltag" data-kind="syms" data-v="${esc(x)}" aria-label="Sembolü sil">✕</button></span>`).join("")}</div>` : `<p class="subtle" style="font-size:14px">Ekleme ekranından "özel sembol olarak ekle" dediklerin burada listelenir.</p>`}</div>
</div>`;
}
function viewMoreData() {
  const hasFS = typeof window.showSaveFilePicker === "function",
    stor =
      state.file === "ok"
        ? "<b>otomatik dosya kaydı açık</b> (" + esc(state.fileName) + ")"
        : state.file === "need"
          ? "otomatik kayıt için izin gerekli"
          : "otomatik dosya kaydı kapalı";
  return `<div class="stack">${pageHead("Veri ve yedek", 1)}
<div class="card s3">
<p class="sect-h">Yedek</p>
<div class="acc-f"><button type="button" class="btn sm primary" data-act="jsonexport">JSON yedekle</button><button type="button" class="btn sm secondary" data-act="jsonexport">Paylaş</button></div>
<p class="subtle" style="font-size:13px">${backupNote()}</p>
<div class="acc-f"><button type="button" class="btn sm secondary" data-act="csvexport">CSV dışa aktar</button></div>
</div>
<div class="card s3">
<p class="sect-h">Geri yükleme</p>
<div class="acc-f">
${lpick("JSON yedeğini geri yükle.", "Mevcut defterin üzerine yazar; işlem listesi yenilenir.", "json", ".json")}
${lpick("İşlemleri CSV'den içe aktar.", "Excel/MT5/TradingView dışa aktarımı. Sütunlar otomatik eşleşir.", "csv", ".csv")}
${hasFS ? `<div class="acc-f"><button type="button" class="btn sm secondary" data-act="jsonmerge">Başka yedeği birleştir</button><span class="muted" style="font-size:13px">Çiftleri atlar, yenisini ekler.</span></div>` : ""}
${hasFS ? (state.file === "ok" ? `<div class="acc-f"><span class="muted" style="font-size:13px">${stor}</span><button type="button" class="btn sm ghost" data-act="unlinkfile">Kapat</button></div>` : `<div class="acc-f"><button type="button" class="btn sm secondary" data-act="linkfile">Otomatik kayıt dosyası seç</button><span class="muted" style="font-size:13px">${stor}${state.file === "need" ? " (izin gerekli)" : ""}</span></div>`) : ""}
</div>
</div>
<div class="card s3">
<p class="sect-h">Tehlike bölgesi</p>
<div class="acc-f"><button type="button" class="btn sm danger" data-act="clear">Tüm verileri sıfırla</button><span class="muted" style="font-size:13px">Gerçekten istiyorsan SİL yaz.</span></div>
</div>
<p class="subtle foot">${state.trades.length} işlem · ${state.accounts.length} hesap${state.memoryOnly ? " · depolama kullanılamıyor" : ""}</p>
</div>`;
}
function viewTradeDetail(id) {
  const t = state.trades.find(x => x.id === id);
  if (!t)
    return `<div style="padding:64px 0;text-align:center"><p class="muted">İşlem bulunamadı.</p></div>`;
  const r = risk(t),
    p = pnl(t),
    by = byExit(state.trades.filter(x => accountId(x) === accountId(t))),
    i = by.findIndex(x => x.id === id),
    eqAfter = by.slice(0, i + 1).reduce((s, x) => s + pnl(x), 0),
    rp = riskPct(t),
    a = accountOf(t),
    si = SYMS.find(x => x[0] === t.symbol),
    needFix = si && si[1] !== 1 && (t.mult || 1) === 1;
  const row = (l, v) => `<div class="rowline"><span>${l}</span><span>${v}</span></div>`;
  const longNote =
    t.qty * (t.mult || 1) >= 1e4
      ? "Kontrat çarpanı eksik olabilir (ör. forex 100.000). Kontrol et."
      : "";
  const d = decimalPlaces(t.entry),
    closeCard =
      t.exit == null
        ? `<div class="card s3"><p class="sect-h">Pozisyonu kapat</p>
<div class="grid2"><div><label class="fld"><span>Çıkış fiyatı</span><input class="inp" id="cx" inputmode="decimal" enterkeyhint="next" autocomplete="off" placeholder="ör. 1.0880"></label><p class="ferr" id="fe-cx" role="alert"></p></div><div><label class="fld"><span>Miktar (boş = tamamı)</span><input class="inp" id="cq" inputmode="decimal" placeholder="ör. 0.05"></label><p class="ferr" id="fe-cq" role="alert"></p></div></div>
<p class="subtle" style="font-size:13px">Açık miktar: ${numF(t.qty, 2)} · Miktarı boş bırakırsan tamamı kapanır; daha küçük girersen kısmi kapanır.</p>
<button type="button" class="btn lg primary" data-act="closetrade" data-id="${esc(t.id)}">Kapat</button></div>`
        : "";
  return `<div class="stack">
<a href="#/trades" class="bk">‹ İşlemler</a>
<div class="card">
<div style="display:flex;align-items:center;gap:8px;flex-wrap:wrap"><h1 style="font-size:24px;font-weight:600;letter-spacing:-.03em">${esc(t.symbol)}</h1>${badge(t.dir === "LONG" ? "Long" : "Short", t.dir === "LONG" ? "up" : "dn")}${t.plan === "evet" ? badge("plana uydu", "up") : ""}${t.plan === "hayır" ? badge("plan dışı", "dn") : ""}${p != null ? badge(money(p), p > 0 ? "up" : p < 0 ? "dn" : "muted") : ""}</div>
<p class="subtle mono" style="margin-top:6px;font-size:13px">${esc(formatWhen(t.date))}${t.exitDate ? " → " + esc(formatWhen(t.exitDate)) : ""}${holdMin(t) != null ? " · " + holdText(holdMin(t)) : ""}</p>
${t.exit == null ? `<div class="card" style="margin-top:12px;background:var(--elevated);box-shadow:none"><p class="lbl">Açık pozisyon</p><p class="mono" style="margin-top:4px;font-size:20px;font-weight:500">${esc(formatPrice(t.qty, 2))} lot @ ${esc(formatPrice(t.entry, d))}</p>${r != null ? `<p class="muted" style="margin-top:4px;font-size:13px">Stop ${esc(formatPrice(t.stop, d))} · risk ${numF(r, 2)}${rp != null ? " (" + numF(rp, 2) + "%)" : ""}</p>` : ""}</div>` : `<div class="card" style="margin-top:12px;background:var(--elevated);box-shadow:none"><p class="lbl">Sonuç</p><p class="mono" style="margin-top:4px;font-size:20px;font-weight:500;${p != null ? "color:var(--" + pnlClass(p) + ")" : ""}">${p == null ? "—" : money(p)}</p>${rr(t) != null ? `<p class="muted" style="margin-top:4px;font-size:13px">${formatR(rr(t))} · risk ${r != null ? numF(r, 2) : "—"}</p>` : ""}</div>`}
</div>
${closeCard}
<div class="card"><p class="lbl">İşlem bilgileri</p><div class="divide" style="margin-top:8px">
${row("Giriş", '<span class="mono">' + esc(formatPrice(t.entry, d)) + "</span>")}
${t.exit != null ? row("Çıkış", '<span class="mono">' + esc(formatPrice(t.exit, d)) + "</span>") : ""}
${row("Miktar", '<span class="mono">' + esc(formatPrice(t.qty, 2)) + "</span>" + (t.mult && t.mult !== 1 ? " × " + esc(formatPrice(t.mult, 0)) : ""))}
${t.stop != null ? row("Stop-loss", '<span class="mono">' + esc(formatPrice(t.stop, d)) + "</span>") : ""}
${t.stop0 != null ? row("İlk stop", '<span class="mono">' + esc(formatPrice(t.stop0, d)) + "</span>") : ""}
${t.tp != null ? row("Hedef", '<span class="mono">' + esc(formatPrice(t.tp, d)) + "</span>") : ""}
${t.fees ? row("Komisyon", '<span class="mono">' + esc(numF(t.fees, 2)) + "</span>") : ""}
${t.fx && t.fx !== 1 ? row("Kur", '<span class="mono">' + esc(numF(t.fx, 4)) + "</span>") : ""}
${t.setup ? row("Setup", esc(t.setup)) : ""}
${t.emo ? row("Duygu", esc(t.emo)) : ""}
${t.mist ? row("Hata", esc(t.mist)) : ""}
${t.rt ? row("İşlem puanı", t.rt + " ★") : ""}
${t.notes ? `<div style="margin-top:8px"><p class="lbl">Not</p><p style="margin-top:4px;font-size:15px;white-space:pre-wrap">${esc(t.notes)}</p></div>` : ""}
${t.img ? `<div style="margin-top:10px"><p class="lbl">Görsel</p><img src="${esc(t.img)}" alt="İşlem grafiği" style="width:100%;border-radius:10px;display:block;margin-top:6px"></div>` : ""}
</div></div>
<div class="card"><p class="lbl">Hesap</p><div class="divide" style="margin-top:8px">
${row("Hesap", esc(a ? a.name : "—"))}
${row("Güncel bakiye", '<span class="mono">' + esc(money(a ? currentBalance(a) : null)) + "</span>")}
${row("Equity (bu işleme kadar)", '<span class="mono">' + esc(money(eqAfter)) + "</span>")}
</div></div>
${longNote || needFix ? `<div class="card"><p class="lbl">Notlar</p>${longNote ? `<p class="warn" style="margin-top:4px;font-size:14px">${longNote}</p>` : ""}${needFix ? `<p class="warn" style="margin-top:4px;font-size:14px">${si[0]} için kontrat çarpanı girilmemiş (şu an 1).${si[2] === "Forex" ? " Forex çarpanı genelde 100.000." : ""} Düzenle → Gelişmiş'ten gir.</p>` : ""}</div>` : ""}
<div class="actrow"><a class="btn md secondary" href="#/add?id=${encodeURIComponent(t.id)}">Düzenle</a><button type="button" class="btn md secondary" data-act="clone" data-id="${esc(t.id)}">Kopyala</button><button type="button" class="btn md danger" data-act="deltrade" data-id="${esc(t.id)}">Sil</button></div>
</div>`;
}

/* ---- Ayarlar, hesaplar, etiketler, veri ve işlem ayrıntısı ---- */
let accTimer = null,
  INSTALL_PROMPT = null;
window.addEventListener("beforeinstallprompt", e => {
  e.preventDefault();
  INSTALL_PROMPT = e;
  Core.refresh();
});
/** Yedeği paylaş (destekleniyorsa) ya da dosya olarak indir. */
function exportJson() {
  const json = backupJson();
  markBackup();
  if (navigator.share) {
    const file = new File([json], "ascentia-defter.json", { type: "application/json" });
    if (navigator.canShare && navigator.canShare({ files: [file] })) {
      navigator.share({ files: [file], title: "Ascentia yedek" }).catch(() => {});
      Core.refresh();
      return;
    }
  }
  downloadText("ascentia-defter.json", json, "application/json");
  toast("Yedek indirildi");
  Core.refresh();
}
function addAccount() {
  const input = document.querySelector("[data-newacc]");
  const name = ((input && input.value) || "").trim().slice(0, 24);
  if (!name) {
    toast("Hesap adı gir");
    return;
  }
  state.accounts.push({
    id: "a" + Date.now().toString(36),
    name,
    balance: 0,
    dl: 0,
    md: 0,
    cur: "",
  });
  saveAccounts(state.accounts);
  Core.refresh();
}

function deleteAccount(el) {
  const id = el.dataset.id;
  if (state.accounts.length <= 1) {
    toast("Son hesap silinemez", "err");
    return;
  }
  if (state.trades.some(t => accountId(t) === id)) {
    toast("Bu hesapta işlem var", "err");
    return;
  }
  if (!typedConfirm("Hesap silinsin mi?")) return;
  state.accounts = state.accounts.filter(a => a.id !== id);
  if (state.filterAccountId === id) state.filterAccountId = "all";
  saveAccounts(state.accounts);
  Core.refresh();
}
/** İşlemi siler; 6 sn boyunca "Geri al" sunar. */
function deleteTrade(el) {
  const trade = state.trades.find(x => x.id === el.dataset.id);
  if (!trade) return;
  if (!typedConfirm("İşlem silinsin mi? (" + trade.symbol + " " + formatWhen(trade.date) + ")")) {
    return;
  }
  const index = state.trades.indexOf(trade);
  state.trades.splice(index, 1);
  saveTrades(state.trades);
  location.hash = "#/trades";
  toast("Silindi", null, 6000, {
    label: "Geri al",
    fn: () => {
      state.trades.splice(index, 0, trade);
      saveTrades(state.trades);
      Core.refresh();
    },
  });
}
/** Tüm verileri siler (localStorage + IndexedDB). Tema ve bağlı dosya adı korunur. */
function resetAllData() {
  if (!typedConfirm("TÜM veriler silinsin mi?")) return;
  const theme = state.theme,
    fileName = state.fileName;
  try {
    localStorage.clear();
  } catch (e) {}
  wipeStores();
  saveTheme(theme);
  Object.assign(state, {
    trades: [],
    accounts: [{ id: "a1", name: "Ana hesap", balance: 0, dl: 0, md: 0, cur: "" }],
    tags: JSON.parse(JSON.stringify(DEFAULT_TAGS)),
    filterAccountId: "all",
    lastBackupAt: null,
    memoryOnly: false,
    file: "none",
    fileName,
    theme,
  });
  saveBackupStamp("");
  location.hash = "#/";
  Core.refresh();
}
/** Açık pozisyonu kapatır: miktar boşsa tamamını, daha küçükse kısmen (applyPartial). */
function closeTrade(el) {
  const trade = state.trades.find(x => x.id === el.dataset.id);
  if (!trade || trade.exit != null) return;
  const price = num($("#cx").value),
    qty = $("#cq") ? num($("#cq").value) : null,
    errEl = $("#fe-cq");
  if (price == null || price <= 0) {
    if (errEl) errEl.textContent = "Geçerli bir çıkış fiyatı gir.";
    return;
  }
  if (qty != null) {
    const error = applyPartial(trade.id, qty, price);
    if (error) {
      if (errEl) errEl.textContent = error;
      return;
    }
    toast(
      "Kısmi kapatıldı: " + numF(qty, 2) + " @ " + numF(price, 4) + " · kalan " + numF(trade.qty, 2)
    );
    Core.refresh();
    return;
  }
  trade.exit = price;
  trade.exitDate = nowLocal() < trade.date ? trade.date : nowLocal();
  saveTrades(state.trades);
  Core.refresh();
}

function onAccountInput(t) {
  // hesap alanları her tuşta IndexedDB'ye yazmaz — 400 ms debounce
  if (t.dataset.aid === undefined) return;
  const [f, id] = t.dataset.aid.split(":");
  const a = state.accounts.find(x => x.id === id);
  if (!a) return;
  a[f] =
    f === "name"
      ? (t.value || "").toString().slice(0, 32)
      : f === "cur"
        ? (t.value || "").toUpperCase().slice(0, 3)
        : num(t.value) || 0;
  if (f === "cur" && a.cur) state.prefsCur = a.cur;
  clearTimeout(accTimer);
  accTimer = setTimeout(() => saveAccounts(state.accounts), 400);
}

function importCsvFile(file) {
  file
    .text()
    .then(txt => {
      const st = importCsv(txt);
      state.trades = st.trades;
      saveTrades(state.trades);
      if (st.added) {
        toast(
          st.added +
            " işlem içe aktarıldı" +
            (st.skipped ? " · " + st.skipped + " atlandı" : "") +
            (st.why ? " (" + st.why + ")" : "")
        );
        if (st.nofx)
          toast(st.nofx + " işlemde P&L kuru eksik — kapanmış sonuçlar bozuk olabilir", "err");
      } else {
        toast("İçe aktarılamadı: " + (st.why || "satır bulunamadı"), "err");
      }
    })
    .catch(() => toast("CSV okunamadı", "err"));
}

function importJsonFile(file, merge) {
  file
    .text()
    .then(txt => {
      let raw;
      try {
        raw = JSON.parse(txt);
      } catch (e2) {
        toast("JSON okunamadı", "err");
        return;
      }
      if (merge) {
        const r = jsonmerge(raw);
        toast(r ? r.added + " eklendi · " + r.skipped + " atlandı" : "Geçersiz yedek", "err");
        if (r) Core.refresh();
        return;
      }
      const n = restoreJson(raw, !state.trades.length);
      if (n != null) {
        saveTrades(state.trades);
        saveAccounts(state.accounts);
        saveTags(state.tags);
        toast(n + " işlem geri yüklendi");
      }
      Core.refresh();
    })
    .catch(() => toast("Dosya okunamadı", "err"));
}

Core.nav({
  path: "/more",
  label: "Daha",
  order: 50,
  side: `<path d="M20 7h-9"/><path d="M14 17H5"/><circle cx="17" cy="17" r="3"/><circle cx="7" cy="7" r="3"/>`,
  bottom: `<circle cx="5" cy="12" r="1.5"/><circle cx="12" cy="12" r="1.5"/><circle cx="19" cy="12" r="1.5"/>`,
});
Core.route("/more", { nav: "/more", view: viewMore });
Core.route("/more/accounts", { nav: "/more", view: viewAccounts });
Core.route("/more/tags", { nav: "/more", view: viewTags });
Core.route("/more/data", { nav: "/more", view: viewMoreData });
Core.route("/trades/:id", { nav: "/trades", view: ({ args }) => viewTradeDetail(args.id) });
Core.action("install", () => {
  if (!INSTALL_PROMPT) return;
  INSTALL_PROMPT.prompt();
  INSTALL_PROMPT = null;
  Core.refresh();
});
Core.action("theme", el => {
  state.theme = el.dataset.v;
  saveTheme(state.theme);
  document.documentElement.classList.add("tx");
  applyTheme();
  setTimeout(() => document.documentElement.classList.remove("tx"), 400);
  Core.refresh();
});
Core.action("jsonexport", exportJson);
Core.action("csvexport", () => {
  const csv = tradesToCsv(filterAccount(state.trades, state.filterAccountId));
  downloadText("ascentia-islemler.csv", csv, "text/csv");
  toast("CSV indirildi");
});
Core.action("jsonmerge", () => {
  const input = document.querySelector('[data-file="json"]');
  if (!input) return;
  input.dataset.merge = "1";
  input.click();
});
Core.action("linkfile", () => linkFile());
Core.action("unlinkfile", () => {
  unlinkFile();
  toast("Otomatik kayıt kapatıldı");
});
Core.action("fileresume", () => resumeFile());
Core.action("addacc", addAccount);
Core.action("delacc", deleteAccount);
Core.action("addtag", el => {
  const input = document.querySelector('[data-newtag="' + el.dataset.kind + '"]');
  addTag(el.dataset.kind, input ? input.value : "");
});
Core.action("deltag", el => {
  const { kind, v } = el.dataset; // şablon: data-kind="setups|emos|mists|syms" data-v="etiket"
  state.tags[kind] = state.tags[kind].filter(x => x !== v);
  saveTags(state.tags);
  Core.refresh();
});
Core.action("deltrade", deleteTrade);
Core.action("clear", resetAllData);
Core.action("closetrade", closeTrade);
Core.listen("input", e => {
  const t = e.target;
  if (t.dataset.aid !== undefined) {
    onAccountInput(t);
    return true;
  }
  // yeni etiket / hesap adı alanları yalnızca düğmeyle kaydedilir
  if (t.dataset.newtag !== undefined || t.dataset.newacc !== undefined) return true;
});
Core.listen("change", e => {
  const t = e.target;
  if (t.dataset.file !== "csv" && t.dataset.file !== "json") return;
  const f = t.files[0];
  const merge = t.dataset.merge === "1";
  t.value = "";
  if (!f) return true;
  if (t.dataset.file === "csv") importCsvFile(f);
  else importJsonFile(f, merge);
  return true;
});
Core.listen("keydown", e => {
  if (e.key !== "Enter") return;
  if (e.target.dataset.newacc !== undefined) {
    e.preventDefault();
    const b = document.querySelector('[data-act="addacc"]');
    if (b) b.click();
    return true;
  }
  if (e.target.dataset.newtag !== undefined) {
    e.preventDefault();
    const b =
      e.target.closest(".card") && e.target.closest(".card").querySelector('[data-act="addtag"]');
    if (b) b.click();
    return true;
  }
});
