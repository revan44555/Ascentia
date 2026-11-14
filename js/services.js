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
function addTag(k, v) {
  const raw = (v || "").trim(),
    n = raw.slice(0, 24),
    lc = x => x.toLocaleLowerCase("tr");
  if (!n) return;
  if (state.tags[k].some(x => lc(x) === lc(n))) {
    toast("Bu etiket zaten var");
    return;
  }
  state.tags[k].push(n);
  saveTags(state.tags);
  Core.refresh();
}
