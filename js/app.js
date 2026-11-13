"use strict";
let qcEmo = "",
  qcNote = "";
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
// taslak, yalnızca işlem o günden beri değişmediyse geri yüklenir; "kirli" form ilk haline göre ölçülür
function tradeSig(t) {
  return t ? JSON.stringify(fromTrade(t)) : "";
}
function formDirty() {
  const b = form.id && state.trades.find(t => t.id === form.id),
    ref = b ? fromTrade(b) : emptyForm();
  return Object.keys(form).some(
    k => !k.startsWith("__") && k !== "multAuto" && (k !== "date" || b) && form[k] !== ref[k]
  );
}
const navKey = p => (p.startsWith("/trades") ? "/trades" : p);

function render() {
  const { path, params } = parseHash();
  const view = $("#view");
  document
    .querySelectorAll("[data-r]")
    .forEach(a => a.classList.toggle("on", navKey(a.getAttribute("data-r")) === navKey(path)));
  if (path === "/add") {
    const d = (() => {
      try {
        return JSON.parse(localStorage.getItem("tj_draft") || "null");
      } catch (e) {
        return null;
      }
    })();
    if (form === null || form.__for !== path + (params.id || "")) {
      if (params.id) {
        const tr0 = state.trades.find(t => t.id === params.id);
        form = tr0 ? fromTrade(tr0) : emptyForm();
        // yarım kalmış düzenleme taslaktan geri yüklenir
        if (tr0 && d && d.__editId === params.id && d.__sig === tradeSig(tr0))
          Object.assign(form, d, { date: form.date });
      } else {
        const e = emptyForm();
        form = Object.assign(
          e,
          d && d.__editId ? { ...d, __editId: null, id: undefined } : d || {},
          { date: e.date }
        );
      }
      form.__for = path + (params.id || "");
    }
  }
  const html =
    path === "/"
      ? viewHome()
      : path === "/trades"
        ? viewTrades()
        : path === "/add"
          ? viewAdd()
          : path === "/insights"
            ? viewInsights()
            : path === "/more"
              ? viewMore()
              : path === "/more/accounts"
                ? viewAccounts()
                : path === "/more/tags"
                  ? viewTags()
                  : path === "/more/data"
                    ? viewMoreData()
                    : path.startsWith("/trades/")
                      ? viewTradeDetail(dec(path.slice(8)))
                      : viewHome();
  view.innerHTML = html;
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

function saveForm() {
  if (!form) return;
  ["entry", "stop", "tp", "stop0", "exit"].forEach(k => {
    if (form[k] !== "") form[k] = fixThou(form.symbol, form[k]);
  });
  const sym = String(form.symbol || "")
    .trim()
    .toUpperCase();
  if (sym) {
    const r = symFind(sym);
    if (r.exact) applySym(r.exact);
  }
  const q0 = form.qty;
  applySym(sym);
  form.qty = q0;
  const now = nowLocal();
  const ex0 = form.exit === "" || form.exit == null ? null : num(form.exit);
  // çıkış yoksa "plana uydu" etiketi kaydedilmez
  const rec = {
    id: form.id || newId(),
    date: form.date || now,
    symbol: sym,
    dir: form.dir,
    entry: num(form.entry),
    exit: ex0,
    qty: num(form.qty),
    mult: num(form.mult) || 1,
    acc: form.acc || "",
    plan: ex0 != null ? form.plan : "",
    mist: form.mist || "",
    stop: form.stop === "" ? null : num(form.stop),
    stop0: form.stop0 === "" ? null : num(form.stop0),
    tp: form.tp === "" ? null : num(form.tp),
    fees: num(form.fees) || 0,
    fx: num(form.fx) > 0 ? num(form.fx) : 1,
    exitDate: form.exitDate || "",
    setup: form.setup || "",
    emo: form.emo || "",
    notes: form.notes || "",
    rt: num(form.rt),
    img: form.img || "",
  };
  const old0 = form.id ? state.trades.find(t => t.id === form.id) : null;
  rec.qc = old0 ? old0.qc || 0 : form.qc || 0;
  let chkToday = null;
  try {
    const s0 = localStorage.getItem("tj_chk_" + todayStamp());
    if (typeof s0 === "string" && s0.length) chkToday = [...s0].filter(c => c === "1").length;
  } catch (e) {}
  rec.chk = old0 ? old0.chk : chkToday;
  if (old0 && old0.grp) rec.grp = old0.grp;
  const qc =
    QCUR[sym] ||
    (SYMS.find(x => x[0] === sym) &&
    SYMS.find(x => x[0] === sym)[2] === "Forex" &&
    !sym.endsWith("USD")
      ? sym.slice(3, 6)
      : "");
  const accCur = ((accountOf(rec) || {}).cur || state.prefsCur || "USD").toUpperCase();
  if (qc && qc !== accCur && rec.fx === 1 && ex0 != null) {
    showFormErr(
      "P&L kuru gerekli (" +
        qc +
        " → " +
        (state.prefsCur || "USD") +
        "). Gelişmiş → P&L kuru alanına gir."
    );
    return;
  }
  const msg = validate(rec);
  if (msg) {
    showFormErr(msg);
    const g = $("#symsug");
    if (g) g.innerHTML = symHint(true);
    return;
  }
  if (ex0 != null && !rec.exitDate) rec.exitDate = now;
  try {
    localStorage.removeItem("tj_draft");
  } catch (e) {}
  const i = state.trades.findIndex(t => t.id === rec.id);
  if (i >= 0) state.trades[i] = rec;
  else state.trades.push(rec);
  saveTrades(state.trades);
  LASTLOT[sym] = rec.qty;
  try {
    localStorage.setItem("tj_lastlot_v1", JSON.stringify(LASTLOT));
  } catch (e) {}
  const justAdded = rec.id;
  form = null;
  location.replace("#/trades/" + encodeURIComponent(justAdded));
  if (i < 0) toast("Kaydedildi");
}

function tradesToCsv(trades) {
  const q = v => {
    let s = String(v ?? "");
    if (/^[=+\-@\t\r]/.test(s) && !(s.trim() !== "" && Number.isFinite(Number(s)))) s = "'" + s;
    return /[",\r\n]/.test(s) ? '"' + s.replace(/"/g, '""') + '"' : s;
  };
  const head = [
    "tarih",
    "sembol",
    "yon",
    "hacim",
    "giris",
    "kapanis",
    "komisyon",
    "swap",
    "tp",
    "sl",
    "ilk_stop",
    "cikis_tarihi",
    "carpan",
    "kur",
    "net_pnl",
    "R",
    "setup",
    "duygu",
    "hata",
    "plan",
    "puan",
    "chk",
    "not",
    "hesap",
  ];
  const lines = [head.join(",")];
  trades.forEach(t => {
    lines.push(
      [
        q(formatWhen(t.date)),
        q(t.symbol),
        t.dir,
        q(t.qty),
        q(t.entry),
        q(t.exit),
        q(t.fees || ""),
        q(t.swap || ""),
        q(t.tp),
        q(t.stop),
        q(t.stop0),
        q(t.exitDate ? formatWhen(t.exitDate) : ""),
        q(t.mult || 1),
        q(t.fx || 1),
        q(pnl(t)),
        q(rr(t) != null ? Math.round(rr(t) * 100) / 100 : ""),
        q(t.setup),
        q(t.emo),
        q(t.mist),
        q(t.plan),
        q(t.rt || ""),
        q(t.chk == null ? "" : t.chk),
        q(t.notes),
        q((accountOf(t) || {}).name || ""),
      ].join(",")
    );
  });
  return lines.join("\n");
}
function downloadText(name, text, mime) {
  const b = new Blob([mime === "text/csv" ? "﻿" + text : text], { type: mime || "text/plain" });
  const u = URL.createObjectURL(b);
  const a = document.createElement("a");
  a.href = u;
  a.download = name;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(u), 1500);
}
function markBackup() {
  state.lastBackupAt = Date.now();
  saveBackupStamp(String(Date.now()));
}

/* ------------------------------------------------------------------------- *
 *  Tıklama yönlendirme
 *
 *  Ekrandaki tıklanabilir her öğe data-* özniteliğiyle işaretlenir ve tek bir
 *  dinleyici (olay temsili) onu ilgili işleyiciye yönlendirir:
 *    - data-act="<eylem>"  → ACTIONS["ad"]
 *    - diğer özniteliklerle (data-chip, data-rng …) → CLICK_ATTRS
 *  Yeni bir etkileşim eklemek için bu iki tablodan birine giriş eklemek yeter;
 *  tıklama seçicisi (CLICK_SELECTOR) tablolardan üretildiği için unutulamaz.
 * ------------------------------------------------------------------------- */

/** Hızlı giriş zamanı: "N dakika önce". */
function onQuickEntryTime(el) {
  form.date = toLocalInput(new Date(Date.now() - +el.dataset.qd * 6e4));
  const input = document.querySelector('[data-f="date"]');
  if (input) input.value = form.date;
}

/** Hızlı çıkış zamanı: girişten N dakika sonra (gelecekteyse şimdiye çekilir). */
function onQuickExitTime(el) {
  const exitAt = toLocalInput(new Date(new Date(form.date).getTime() + +el.dataset.qx * 6e4));
  const now = toLocalInput(new Date());
  form.exitDate = exitAt > now ? now : exitAt;
  const input = document.querySelector('[data-f="exitDate"]');
  if (input) input.value = form.exitDate;
}

/** İşlemler listesindeki filtre düğmesi (data-lchip="alan:değer"): aynı düğmeye tekrar basınca kalkar. */
function onListChip(el) {
  const [key, value] = el.dataset.lchip.split(":");
  listState[key] = listState[key] === value ? "" : value;
  const list = $("#tradeList");
  if (list) list.innerHTML = tradesListHtml();
  document.querySelectorAll("[data-lchip]").forEach(chip => {
    const [k, v] = chip.dataset.lchip.split(":");
    chip.classList.toggle("on", listState[k] === v);
    chip.setAttribute("aria-pressed", listState[k] === v);
  });
}

/** İşlem formundaki seçim düğmesi (yön, hesap, setup, duygu, plan, puan …). */
function onFormChip(el) {
  const key = el.dataset.chip,
    value = el.dataset.v;
  if (key === "acc" || key === "dir") {
    form[key] = value;
    render();
    return;
  }
  // allowOff: aynı düğmeye tekrar basınca seçim kalkar (data-off="0" ise kalkmaz)
  form[key] = form[key] === value && el.dataset.off !== "0" ? "" : value;
  if (key === "rt") {
    render();
    return;
  }
  const on = form[key] === value;
  el.classList.toggle("on", on);
  el.classList.toggle("off", !on);
  el.setAttribute("aria-pressed", on);
}

/**
 * data-* özniteliğine göre yönlendirme. Sıra önemli: ilk eşleşen çalışır.
 * `when` koşulu sağlanmazsa sıradaki girişe geçilir.
 */
const CLICK_ATTRS = [
  { attr: "tip", when: el => !el.dataset.act, run: el => toast(el.getAttribute("data-tip")) },
  { attr: "qd", run: onQuickEntryTime },
  { attr: "qx", when: () => form && form.date, run: onQuickExitTime },
  {
    attr: "itab",
    run: el => {
      INS_TAB = el.dataset.itab;
      render();
    },
  },
  {
    attr: "facc",
    run: el => {
      state.filterAccountId = el.dataset.facc;
      render();
    },
  },
  {
    attr: "rng",
    run: el => {
      RANGE = el.dataset.rng;
      render();
    },
  },
  { attr: "lchip", run: onListChip },
  {
    attr: "qcemo",
    run: el => {
      qcEmo = qcEmo === el.dataset.qcemo ? "" : el.dataset.qcemo;
      render();
    },
  },
  { attr: "chip", when: () => form, run: onFormChip },
  {
    attr: "sym",
    run: el => {
      applySym(el.dataset.sym);
      render();
    },
  },
];

/** "Anı değerlendir" kartı: duygu + not kaydet. */
function saveQuickEval(el) {
  const trade = state.trades.find(x => x.id === el.dataset.id);
  if (!trade) return;
  if (qcEmo) trade.emo = qcEmo;
  const note = ((document.getElementById("qcNote") || {}).value || "").trim();
  if (note) trade.notes = trade.notes ? trade.notes + "\n" + note : note;
  trade.qc = 1;
  qcEmo = "";
  qcNote = "";
  saveTrades(state.trades);
  toast("Değerlendirme kaydedildi");
  render();
}

/** Yedeği paylaş (destekleniyorsa) ya da dosya olarak indir. */
function exportJson() {
  const json = backupJson();
  markBackup();
  if (navigator.share) {
    const file = new File([json], "ascentia-defter.json", { type: "application/json" });
    if (navigator.canShare && navigator.canShare({ files: [file] })) {
      navigator.share({ files: [file], title: "Ascentia yedek" }).catch(() => {});
      render();
      return;
    }
  }
  downloadText("ascentia-defter.json", json, "application/json");
  toast("Yedek indirildi");
  render();
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
  render();
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
  render();
}

/** Formdaki sembolü "özel sembol" olarak listeye ekler. */
function addCustomSymbol() {
  const raw = (form.symbol || "").trim().toUpperCase();
  if (raw.length < 2) {
    toast("En az 2 karakter");
    return;
  }
  if (!state.tags.syms.includes(raw)) {
    state.tags.syms.push(raw);
    saveTags(state.tags);
  }
  applySym(raw);
  render();
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
      render();
    },
  });
}

/** İşlemi yeni kayıt şablonu olarak kopyalar (id olmadan, şimdiki zamanla). */
function cloneTrade(el) {
  const trade = state.trades.find(x => x.id === el.dataset.id);
  if (!trade) return;
  const copy = fromTrade(trade);
  delete copy.id;
  form = { ...copy, date: nowLocal(), __for: "/add" };
  location.hash = "#/add";
  render();
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
  render();
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
    render();
    return;
  }
  trade.exit = price;
  trade.exitDate = nowLocal() < trade.date ? trade.date : nowLocal();
  saveTrades(state.trades);
  render();
}

/** data-act="<eylem>" → işleyici. */
const ACTIONS = {
  save: () => saveForm(),
  qcsave: saveQuickEval,
  imgdel: () => {
    if (form) form.img = "";
    render();
  },
  install: () => {
    if (!INSTALL_PROMPT) return;
    INSTALL_PROMPT.prompt();
    INSTALL_PROMPT = null;
    render();
  },
  togglemore: () => {
    moreOpen = !moreOpen;
    render();
  },
  hidepl: () => {
    try {
      localStorage.setItem("tj_hidepl", localStorage.getItem("tj_hidepl") === "1" ? "0" : "1");
    } catch (e) {}
    render();
  },
  theme: el => {
    state.theme = el.dataset.v;
    saveTheme(state.theme);
    document.documentElement.classList.add("tx");
    applyTheme();
    setTimeout(() => document.documentElement.classList.remove("tx"), 400);
    render();
  },
  jsonexport: exportJson,
  csvexport: () => {
    const csv = tradesToCsv(filterAccount(state.trades, state.filterAccountId));
    downloadText("ascentia-islemler.csv", csv, "text/csv");
    toast("CSV indirildi");
  },
  jsonmerge: () => {
    const input = document.querySelector('[data-file="json"]');
    if (!input) return;
    input.dataset.merge = "1";
    input.click();
  },
  linkfile: () => linkFile(),
  unlinkfile: () => {
    unlinkFile();
    toast("Otomatik kayıt kapatıldı");
  },
  fileresume: () => resumeFile(),
  calprev: () => {
    calOff--;
    render();
  },
  calnext: () => {
    calOff++;
    render();
  },
  more: () => {
    listState.limit += 30;
    const list = $("#tradeList");
    if (list) list.innerHTML = tradesListHtml();
  },
  addacc: addAccount,
  delacc: deleteAccount,
  addtag: el => {
    const input = document.querySelector('[data-newtag="' + el.dataset.kind + '"]');
    addTag(el.dataset.kind, input ? input.value : "");
  },
  deltag: el => {
    const { kind, v } = el.dataset; // şablon: data-kind="setups|emos|mists|syms" data-v="etiket"
    state.tags[kind] = state.tags[kind].filter(x => x !== v);
    saveTags(state.tags);
    render();
  },
  tagdraft: el => {
    tagDraft = { kind: el.dataset.kind, value: "" };
    render();
  },
  addsym: addCustomSymbol,
  deltrade: deleteTrade,
  clone: cloneTrade,
  clear: resetAllData,
  closetrade: closeTrade,
};

/** Tıklama seçicisi tablolardan üretilir: tabloda olan her öznitelik yakalanır. */
const CLICK_SELECTOR = ["[data-act]", ...CLICK_ATTRS.map(c => `[data-${c.attr}]`)].join(",");

document.getElementById("view").addEventListener("click", e => {
  const el = e.target.closest(CLICK_SELECTOR);
  if (!el) return;
  for (const { attr, when, run } of CLICK_ATTRS) {
    if (el.dataset[attr] === undefined) continue;
    if (when && !when(el)) continue;
    run(el);
    return;
  }
  const action = ACTIONS[el.dataset.act];
  if (action) action(el);
});

document.getElementById("view").addEventListener("input", e => {
  const t = e.target;
  if (!t.dataset) return;
  if (t.id === "qcNote") {
    qcNote = t.value;
    return;
  }
  if (t.dataset.lq !== undefined) {
    listState.q = t.value;
    const tl = $("#tradeList");
    if (tl) tl.innerHTML = tradesListHtml();
    return;
  }
  if (
    t.dataset.newtag !== undefined ||
    t.dataset.newacc !== undefined ||
    t.dataset.aid !== undefined
  ) {
    // hesap alanları her tuşta IndexedDB'ye yazmaz — 400 ms debounce
    if (t.dataset.aid !== undefined) {
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
    return;
  }
  if (t.dataset.tagdraft !== undefined) {
    if (tagDraft) tagDraft.value = t.value;
    return;
  }
  if (!form) return;
  if (t.dataset.f === undefined) return;
  const f = t.dataset.f;
  let v = t.value;
  if (["entry", "stop", "tp", "stop0", "exit"].includes(f)) {
    const f2 = fixThou(form.symbol, v);
    if (f2 !== v) {
      t.value = f2;
      v = f2;
    }
  }
  form[f] = v;
  if (f === "symbol") {
    const r = symFind(v);
    if (r.exact) applySym(r.exact);
    form.symbol = v;
    const mi = document.querySelector("[data-f=mult]");
    if (mi && form.multAuto) mi.value = form.mult;
    const su = $("#symsug");
    if (su) su.innerHTML = symHint(false);
    return;
  }
  if (f === "exit") {
    const pw = $("#planwrap");
    if (pw) pw.hidden = !t.value.trim();
    // çıkış silinirken plan etiketi de temizlenir
    if (!t.value.trim()) {
      form.plan = "";
      document.querySelectorAll('[data-chip="plan"]').forEach(c => {
        c.classList.remove("on");
        c.classList.add("off");
        c.setAttribute("aria-pressed", "false");
      });
    }
    const lh = $("#liveh");
    if (lh) lh.innerHTML = liveHint();
    return;
  }
  if (f === "exitDate" || f === "date" || f === "fees") {
    const lh = $("#liveh");
    if (lh) lh.innerHTML = liveHint();
    return;
  }
  if (
    f === "stop" ||
    f === "stop0" ||
    f === "tp" ||
    f === "qty" ||
    f === "mult" ||
    f === "fx" ||
    f === "entry"
  ) {
    const lh = $("#liveh");
    if (lh) lh.innerHTML = liveHint();
    return;
  }
});

document.getElementById("view").addEventListener("change", e => {
  const t = e.target;
  if (t.dataset && t.dataset.file === "img") {
    const f = t.files[0];
    t.value = "";
    if (!f) return;
    if (!/^image\//.test(f.type)) {
      toast("Görsel dosyası seç", "err");
      return;
    }
    imgPrep(f)
      .then(u => {
        if (!form) return;
        form.img = u;
        render();
        toast("Görsel eklendi");
      })
      .catch(() => toast("Görsel eklenemedi (çok büyük olabilir)", "err"));
    return;
  }
  if (t.dataset && t.dataset.file !== undefined) {
    const f = t.files[0];
    t.value = "";
    if (!f) return;
    if (t.dataset.file === "csv") {
      f.text()
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
      return;
    }
    if (t.dataset.file === "json") {
      f.text()
        .then(txt => {
          let raw;
          try {
            raw = JSON.parse(txt);
          } catch (e2) {
            toast("JSON okunamadı", "err");
            return;
          }
          if (t.dataset.merge === "1") {
            const r = jsonmerge(raw);
            toast(r ? r.added + " eklendi · " + r.skipped + " atlandı" : "Geçersiz yedek", "err");
            if (r) render();
            return;
          }
          const n = restoreJson(raw, !state.trades.length);
          if (n != null) {
            saveTrades(state.trades);
            saveAccounts(state.accounts);
            saveTags(state.tags);
            toast(n + " işlem geri yüklendi");
          } else if (n === null && state.trades.length) {
            /* vazgeçildi */
          }
          render();
        })
        .catch(() => toast("Dosya okunamadı", "err"));
      return;
    }
  }
});

// tek keydown handler — Enter sonraki alana geçer, son alanda kaydeder; datetime dahil tutarlı
document.getElementById("view").addEventListener("keydown", e => {
  if (e.key !== "Enter" || !e.target.dataset) return;
  if (e.target.dataset.f && e.target.tagName === "INPUT") {
    e.preventDefault();
    const all = [...document.querySelectorAll("#view input[data-f]")],
      i = all.indexOf(e.target);
    if (all[i + 1]) all[i + 1].focus();
    else saveForm();
    return;
  }
  if (e.target.dataset.tagdraft !== undefined && tagDraft) {
    e.preventDefault();
    const v = e.target.value,
      kind = tagDraft.kind;
    tagDraft = null;
    addTag(kind, v);
    return;
  }
  if (e.target.dataset.newacc !== undefined) {
    e.preventDefault();
    const b = document.querySelector('[data-act="addacc"]');
    if (b) b.click();
    return;
  }
  if (e.target.dataset.newtag !== undefined) {
    e.preventDefault();
    const b =
      e.target.closest(".card") && e.target.closest(".card").querySelector('[data-act="addtag"]');
    if (b) b.click();
    return;
  }
});

document.getElementById("view").addEventListener("pointermove", e => {
  if (!EQ) return;
  const svg = e.target.closest && e.target.closest("#eqsvg");
  if (!svg) return;
  const r = svg.getBoundingClientRect();
  const x = ((e.clientX - r.left) / r.width) * EQ.W;
  let i = Math.round(((x - EQ.pl) / EQ.iw) * (EQ.pts.length - 1));
  i = Math.max(0, Math.min(EQ.pts.length - 1, i));
  const p = EQ.pts[i],
    cur = svg.querySelector("#eqcur");
  if (cur) {
    cur.setAttribute("x", x.toFixed(1));
    cur.setAttribute("opacity", "1");
  }
  const read = document.getElementById("eqread");
  if (read)
    read.textContent = (p.date ? formatWhen(p.date) : "Başlangıç") + " · " + money(p.equity);
});
document.getElementById("view").addEventListener("pointerout", e => {
  if (!EQ) return;
  if (e.target.closest && e.target.closest("#eqsvg")) return;
  const svg = document.getElementById("eqsvg");
  if (!svg) return;
  const cur = svg.querySelector("#eqcur");
  if (cur) cur.setAttribute("opacity", "0");
  const read = document.getElementById("eqread");
  if (read) read.textContent = "";
});

let accTimer = null;

window.addEventListener("hashchange", () => {
  if (!location.hash.startsWith("#/add")) {
    // düzenleme formları da taslak olarak korunur (anahtar: __editId)
    if (form && form.__for && form.__for.startsWith("/add") && formDirty()) {
      try {
        localStorage.setItem(
          "tj_draft",
          JSON.stringify({
            ...form,
            __editId: form.id || null,
            __sig: form.id ? tradeSig(state.trades.find(t => t.id === form.id)) : "",
          })
        );
      } catch (e) {}
    }
    form = null;
  }
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

(async () => {
  await loadAll();
  await fileInit();
  render();
})();
// PWA — yüklenebilirlik + çevrimdışı (yalnızca gerçek tarayıcıda)
let INSTALL_PROMPT = null;
window.addEventListener("beforeinstallprompt", e => {
  e.preventDefault();
  INSTALL_PROMPT = e;
  render();
});
if ("serviceWorker" in navigator && /^https?:$/.test(location.protocol || ""))
  window.addEventListener("load", () => {
    navigator.serviceWorker.register("sw.js").catch(() => {});
  });
