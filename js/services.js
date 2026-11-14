"use strict";
/**
 * Hizmetler: birden çok ekranın ortak kullandığı, ekrana bağlı olmayan işlemler.
 * Ekranlar birbirini çağırmaz; ortak iş buradadır.
 */
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

const TAGKIND = [
  ["setups", "Setup"],
  ["emos", "Duygu"],
  ["mists", "Hata"],
];
/**
 * Etiket ekler. "ok" | "empty" | "exists" döner; mesaj göstermek ve ekranı çizdirmek ekranın işi.
 */
function addTag(k, v) {
  const n = (v || "").trim().slice(0, 24),
    lc = x => x.toLocaleLowerCase("tr");
  if (!n) return "empty";
  if (state.tags[k].some(x => lc(x) === lc(n))) return "exists";
  state.tags[k].push(n);
  saveTags(state.tags);
  return "ok";
}
function removeTag(kind, value) {
  state.tags[kind] = state.tags[kind].filter(x => x !== value);
  saveTags(state.tags);
}
/** Sembolü "özel sembol" listesine ekler (varsa dokunmaz). */
function addSymbolTag(sym) {
  if (state.tags.syms.includes(sym)) return;
  state.tags.syms.push(sym);
  saveTags(state.tags);
}

/* ------------------------------------------------------------------------- *
 *  Veri yazma işlemleri
 *
 *  `state` ve kayıtlı veri YALNIZCA buradan (ve storage.js'ten) değişir. Ekranlar bu işlevleri
 *  çağırır; işlevler DOM'a dokunmaz, toast göstermez, ekranı çizdirmez — sonucu döndürür,
 *  ne gösterileceğine ekran karar verir. Kayıt sonrası `saved:*` olayı yayılır. (test G8)
 * ------------------------------------------------------------------------- */

/** Yeni işlemi ekler ya da aynı id'li kaydın yerine koyar. Yeni eklendiyse true döner. */
function upsertTrade(rec) {
  const i = state.trades.findIndex(t => t.id === rec.id);
  if (i >= 0) state.trades[i] = rec;
  else state.trades.push(rec);
  saveTrades(state.trades);
  return i < 0;
}
/** İşlemi siler; geri almak için {trade, index} döner (yoksa null). */
function removeTrade(id) {
  const trade = state.trades.find(x => x.id === id);
  if (!trade) return null;
  const index = state.trades.indexOf(trade);
  state.trades.splice(index, 1);
  saveTrades(state.trades);
  return { trade, index };
}
/** removeTrade'in geri alınması. */
function reinsertTrade(trade, index) {
  state.trades.splice(index, 0, trade);
  saveTrades(state.trades);
}
/** Açık işlemi tamamen kapatır. Kapanmışsa/yoksa false. */
function closeTradeAt(id, price) {
  const t = state.trades.find(x => x.id === id);
  if (!t || t.exit != null) return false;
  t.exit = price;
  t.exitDate = nowLocal() < t.date ? t.date : nowLocal();
  saveTrades(state.trades);
  return true;
}
/** "Anı değerlendir": duygu + not ekler, qc=1 yapar. İşlem yoksa false. */
function evaluateTrade(id, emo, note) {
  const t = state.trades.find(x => x.id === id);
  if (!t) return false;
  if (emo) t.emo = emo;
  if (note) t.notes = t.notes ? t.notes + "\n" + note : note;
  t.qc = 1;
  saveTrades(state.trades);
  return true;
}
/** CSV içe aktarma sonucunu işlem listesi olarak kaydeder. */
function replaceTrades(trades) {
  state.trades = trades;
  saveTrades(state.trades);
}

// kısmi kapatma çekirdeği — UI (closeTrade miktar alanı) ve testler için tek doğruluk kaynağı.
// Başarı null döner; hata durumunda doğrulama mesajı (string) döner.
function applyPartial(id, q, p, when) {
  const t = state.trades.find(x => x.id === id);
  if (!t || t.exit != null) return "İşlem zaten kapalı.";
  if (q == null || q <= 0) return "Miktar 0'dan büyük olmalı.";
  if (q >= t.qty) return "Tam kapanış için Miktar alanını boş bırak.";
  if (p == null || p <= 0) return "Çıkış fiyatı 0'dan büyük olmalı.";
  const now = when || nowLocal(),
    ch = {
      ...t,
      id: newId(),
      grp: t.grp || t.id,
      rt: null,
      chk: null,
      qty: q,
      exit: p,
      fees: 0,
      exitDate: now < t.date ? t.date : now,
    },
    ve = validate(ch);
  if (ve) return ve;
  t.grp = ch.grp;
  t.qty = Math.round((t.qty - q) * 1e8) / 1e8;
  state.trades.push(ch);
  saveTrades(state.trades);
  return null;
}

/** Yeni hesap ekler ve döner. */
function createAccount(name) {
  const acc = { id: "a" + Date.now().toString(36), name, balance: 0, dl: 0, md: 0, cur: "" };
  state.accounts.push(acc);
  saveAccounts(state.accounts);
  return acc;
}
/** Hesap silinemiyorsa nedeni ("last" | "hasTrades"), silinebiliyorsa null. */
function accountDeleteBlocker(id) {
  if (state.accounts.length <= 1) return "last";
  if (state.trades.some(t => accountId(t) === id)) return "hasTrades";
  return null;
}
function removeAccount(id) {
  state.accounts = state.accounts.filter(a => a.id !== id);
  if (state.filterAccountId === id) state.filterAccountId = "all";
  saveAccounts(state.accounts);
}
let accountSaveTimer = null;
/** Hesap alanını (name|cur|balance|dl|md) günceller; her tuşta yazmamak için kayıt 400 ms geciktirilir. */
function updateAccountField(id, field, raw) {
  const a = state.accounts.find(x => x.id === id);
  if (!a) return;
  a[field] =
    field === "name"
      ? (raw || "").toString().slice(0, 32)
      : field === "cur"
        ? (raw || "").toUpperCase().slice(0, 3)
        : num(raw) || 0;
  if (field === "cur" && a.cur) state.prefsCur = a.cur;
  clearTimeout(accountSaveTimer);
  accountSaveTimer = setTimeout(() => saveAccounts(state.accounts), 400);
}
function setAccountFilter(id) {
  state.filterAccountId = id;
}
function setTheme(theme) {
  state.theme = theme;
  saveTheme(theme);
}
/** Tüm verileri siler (localStorage + IndexedDB). Tema ve bağlı dosya adı korunur. */
function resetAllStores() {
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
}
/** JSON yedeğini geri yükler ve kaydeder. Yüklenen işlem sayısı; vazgeçildiyse/geçersizse null. */
function restoreBackup(raw) {
  const n = restoreJson(raw, !state.trades.length);
  if (n == null) return null;
  saveTrades(state.trades);
  saveAccounts(state.accounts);
  saveTags(state.tags);
  return n;
}
