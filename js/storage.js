"use strict";
const TRADES_KEY = "tj_trades_v1",
  ACC_KEY = "tj_acc_v1",
  TAGS_KEY = "tj_tags_v1",
  THEME_KEY = "tj_theme",
  BACKUP_KEY = "tj_lb";
const DEFAULT_TAGS = {
  setups: ["Breakout", "Pullback", "Trend takibi", "Setup yok"],
  emos: ["Sakin", "Kaygılı", "Heyecanlı", "İntikam", "FOMO"],
  mists: [
    "Erken giriş",
    "Geç giriş",
    "Stop oynattım",
    "Erken çıkış",
    "Fazla risk",
    "Plan dışı işlem",
  ],
  syms: [],
};
function lsGet(k) {
  try {
    return localStorage.getItem(k);
  } catch (e) {
    return null;
  }
}
function lsSet(k, v) {
  try {
    localStorage.setItem(k, v);
    return true;
  } catch (e) {
    return false;
  }
}
const IDB_TIMEOUT = 4000;
let _db = null;
function idb() {
  return (
    _db ||
    (_db = new Promise(res => {
      let done = false;
      const fin = v => {
        if (!done) {
          done = true;
          res(v);
        }
      };
      setTimeout(() => fin(null), IDB_TIMEOUT);
      try {
        const r = indexedDB.open("tj", 1);
        r.onupgradeneeded = () => r.result.createObjectStore("kv");
        r.onsuccess = () => fin(r.result);
        r.onerror = () => fin(null);
        r.onblocked = () => fin(null);
      } catch (e) {
        fin(null);
      }
    }))
  );
}
async function kvGet(k) {
  const d = await idb();
  if (!d) return undefined;
  return new Promise(res => {
    try {
      const q = d.transaction("kv").objectStore("kv").get(k);
      q.onsuccess = () => res(q.result);
      q.onerror = () => res(undefined);
    } catch (e) {
      res(undefined);
    }
  });
}
async function kvSet(k, v) {
  const d = await idb();
  if (!d) return false;
  return new Promise(res => {
    try {
      const t = d.transaction("kv", "readwrite");
      t.objectStore("kv").put(v, k);
      t.oncomplete = () => res(true);
      t.onerror = () => res(false);
    } catch (e) {
      res(false);
    }
  });
}
async function dual(lk, lv, kk, v) {
  const ts = Date.now();
  const a = lsSet(lk, lv);
  if (a) {
    lsSet("tj_ts:" + kk, String(ts));
    lsSet("tj_ts", String(ts));
  }
  const b = await kvSet(kk, v);
  if (b) await kvSet("ts:" + kk, ts);
  if (!a && !b) {
    if (!state.memoryOnly) {
      state.memoryOnly = true;
      toast("Kaydedilemedi. Şimdi JSON yedek al.", "err");
    }
  } else state.memoryOnly = false;
  queueFile();
}
function saveTrades(t) {
  dual(TRADES_KEY, JSON.stringify(t), "trades", t);
}
function saveAccounts(a) {
  dual(ACC_KEY, JSON.stringify(a), "accounts", a);
}
function saveTags(t) {
  dual(
    TAGS_KEY,
    JSON.stringify({ s: t.setups, e: t.emos, m: t.mists, y: t.syms || [] }),
    "tags",
    t
  );
}
// Sıfırlama: localStorage.clear() tek başına yetmez, IndexedDB kopyası yeniden yüklenirdi.
// Bağlı yedek dosyasına dokunmaz (queueFile çağrılmaz).
async function wipeStores() {
  const ts = Date.now();
  await kvSet("trades", []);
  await kvSet("accounts", [{ id: "a1", name: "Ana hesap", balance: 0, dl: 0, md: 0, cur: "" }]);
  await kvSet("tags", JSON.parse(JSON.stringify(DEFAULT_TAGS)));
  await kvSet("ts:trades", ts);
  await kvSet("ts:accounts", ts);
  await kvSet("ts:tags", ts);
}
function saveTheme(t) {
  lsSet(THEME_KEY, t);
}
function saveBackupStamp(ts) {
  lsSet(BACKUP_KEY, String(ts));
}
let EQ = null,
  lastPath = null,
  fh = null,
  fileTimer = null;
const hasFS = typeof window.showSaveFilePicker === "function";
function backupJson() {
  return JSON.stringify(
    {
      schemaVersion: 2,
      exportedAt: new Date().toISOString(),
      source: "ascentia",
      accounts: state.accounts,
      trades: state.trades,
      tags: state.tags,
    },
    null,
    2
  );
}
async function fileInit() {
  if (!hasFS) return;
  fh = (await kvGet("fh")) || null;
  if (!fh) return;
  state.fileName = fh.name;
  try {
    state.file = (await fh.queryPermission({ mode: "readwrite" })) === "granted" ? "ok" : "need";
  } catch (e) {
    state.file = "need";
  }
}
function queueFile() {
  if (!fh || state.file !== "ok") return;
  clearTimeout(fileTimer);
  fileTimer = setTimeout(writeFile, 500);
}
async function writeFile() {
  if (!fh) return false;
  try {
    const w = await fh.createWritable();
    await w.write(backupJson());
    await w.close();
    markBackup();
    state.file = "ok";
    return true;
  } catch (e) {
    state.file = "need";
    return false;
  }
}
async function linkFile() {
  try {
    fh = await window.showSaveFilePicker({
      suggestedName: "ascentia-defter.json",
      types: [{ description: "Ascentia defteri", accept: { "application/json": [".json"] } }],
    });
    await kvSet("fh", fh);
    state.fileName = fh.name;
    state.file = "ok";
    try {
      const f = await fh.getFile();
      if (f.size > 0) {
        const raw = JSON.parse(await f.text());
        if (
          raw &&
          Array.isArray(raw.trades) &&
          raw.trades.length &&
          Array.isArray(raw.accounts) &&
          confirm(
            "Bu dosyada " +
              raw.trades.length +
              " işlem var.\n\nTamam = dosyadan yükle\nİptal = dosyanın üzerine mevcut defter yazılır"
          )
        ) {
          const n = restoreJson(raw, !state.trades.length);
          if (n != null) {
            saveTrades(state.trades);
            saveAccounts(state.accounts);
            saveTags(state.tags);
          }
        }
      }
    } catch (e) {}
    const ok = await writeFile();
    toast(ok ? "Dosyaya bağlandı" : "Dosyaya yazılamadı", ok ? "" : "err");
  } catch (e) {}
  render();
}
async function resumeFile() {
  if (!fh) return;
  try {
    state.file = (await fh.requestPermission({ mode: "readwrite" })) === "granted" ? "ok" : "need";
  } catch (e) {
    state.file = "need";
  }
  if (state.file === "ok") {
    await writeFile();
    toast("Otomatik kaydetme açık");
  }
  render();
}
async function unlinkFile() {
  fh = null;
  state.file = "none";
  state.fileName = "";
  await kvSet("fh", null);
  render();
}

const state = {
  trades: [],
  accounts: [{ id: "a1", name: "Ana hesap", balance: 0 }],
  tags: JSON.parse(JSON.stringify(DEFAULT_TAGS)),
  theme: "dark",
  filterAccountId: "all",
  lastBackupAt: null,
  durable: false,
  memoryOnly: false,
  file: "none",
  fileName: "",
};
function normTags(o) {
  const L = (a, d) => (Array.isArray(a) && a.length ? a.map(String) : d.slice());
  return {
    setups: L(o.setups, DEFAULT_TAGS.setups),
    emos: L(o.emos, DEFAULT_TAGS.emos),
    mists: L(o.mists, DEFAULT_TAGS.mists),
    syms: Array.isArray(o.syms) ? o.syms.map(String) : [],
  };
}
async function readStores() {
  const pj = k => {
    try {
      return JSON.parse(lsGet(k) || "null");
    } catch (e) {
      return null;
    }
  };
  const tsL = k => Number(lsGet("tj_ts:" + k) || lsGet("tj_ts") || 0);
  const tsI = async k => Number((await kvGet("ts:" + k)) || (await kvGet("ts")) || 0);
  // iki depodan hangisi daha yeniyse onu al: her anahtarın kendi zaman damgası var, eşitlikte localStorage
  const pick = async (iv, lv, k) => {
    if (iv == null) return lv;
    if (lv == null) return iv;
    return (await tsI(k)) > tsL(k) ? iv : lv;
  };
  let iT = null,
    iA = null,
    iG = null;
  try {
    const v = await kvGet("trades");
    if (Array.isArray(v)) iT = v;
    const x = await kvGet("accounts");
    if (Array.isArray(x) && x.length) iA = x;
    const g = await kvGet("tags");
    if (g && typeof g === "object" && !Array.isArray(g)) iG = normTags(g);
  } catch (e) {}
  let lT = pj(TRADES_KEY);
  if (!Array.isArray(lT)) lT = null;
  let lA = pj(ACC_KEY);
  if (!Array.isArray(lA) || !lA.length) lA = null;
  const tg = pj(TAGS_KEY);
  const lG =
    tg && typeof tg === "object"
      ? normTags({ setups: tg.s, emos: tg.e, mists: tg.m, syms: tg.y })
      : null;
  return {
    trades: await pick(iT, lT, "trades"),
    accounts: await pick(iA, lA, "accounts"),
    tags: await pick(iG, lG, "tags"),
  };
}
function applyStores(R) {
  state.trades = R.trades || [];
  if (R.accounts) state.accounts = R.accounts;
  {
    const c = state.accounts.find(a => a.cur);
    if (c) state.prefsCur = c.cur;
  }
  if (R.tags) state.tags = R.tags;
}
async function loadAll() {
  applyStores(await readStores());
  state.theme = lsGet(THEME_KEY) === "light" ? "light" : "dark";
  state.lastBackupAt = Number(lsGet(BACKUP_KEY) || 0) || null;
  try {
    if (navigator.storage && navigator.storage.persisted) {
      state.durable = await navigator.storage.persisted();
      if (!state.durable && navigator.storage.persist)
        navigator.storage
          .persist()
          .then(v => {
            state.durable = v;
          })
          .catch(() => {});
    }
  } catch (e) {}
  applyTheme();
}
// theme-color iOS arka plan renkleriyle eşleşir
function applyTheme() {
  document.documentElement.classList.toggle("light", state.theme === "light");
  document.documentElement.classList.toggle("dark", state.theme !== "light");
  const tc = document.querySelector("meta[name=theme-color]");
  if (tc) tc.content = state.theme === "light" ? "#f2f5ef" : "#08110f";
}

function restoreJson(raw, silent) {
  if (!raw || !Array.isArray(raw.accounts) || !Array.isArray(raw.trades)) return null;
  if (!silent && state.trades.length) {
    const n = (raw.trades || []).length;
    if (
      !confirm(
        n +
          " işlemli yedek yüklenecek ve mevcut defterin ÜZERİNE yazılacak.\n\nÖnce mevcut defteri yedeklemek istersen şimdi iptal edip 'Yedekle'yi kullan."
      )
    )
      return null;
  }
  state.accounts = raw.accounts.map(a => ({
    id: String(a.id),
    name: String(a.name || "Hesap"),
    balance: num(a.balance) || 0,
    dl: num(a.dl) || 0,
    md: num(a.md) || 0,
    cur: a.cur ? String(a.cur).toUpperCase() : "",
  }));
  state.trades = (raw.trades || []).map(normTrade).filter(Boolean);
  if (raw.tags) state.tags = normTags(raw.tags);
  markBackup();
  render();
  return state.trades.length;
}
function jsonmerge(raw) {
  if (!raw || !Array.isArray(raw.trades)) return null;
  const accs = state.accounts.slice(),
    find = n =>
      accs.find(a => a.name.toLocaleLowerCase("tr") === String(n || "").toLocaleLowerCase("tr"));
  for (const a of raw.accounts || []) {
    if (!find(a.name))
      accs.push({
        id: String(a.id || "a" + newId()),
        name: String(a.name || "Hesap"),
        balance: num(a.balance) || 0,
        dl: num(a.dl) || 0,
        md: num(a.md) || 0,
        cur: a.cur ? String(a.cur).toUpperCase() : "",
      });
  }
  const key = t => [t.date, t.symbol, t.dir, t.entry, t.qty, t.acc || accs[0].id].join("|");
  const seen = new Set(state.trades.map(key));
  let added = 0,
    skipped = 0;
  // yedekteki işlemler hesabı ID ile tutar (acc); hesap adına çevirip bu defterdeki hesapla eşleştir
  const idName = new Map((raw.accounts || []).map(a => [String(a.id), a.name]));
  for (const x of raw.trades) {
    const t = normTrade(x);
    if (!t) {
      skipped++;
      continue;
    }
    const ac =
      find(x.account || idName.get(String(x.acc)) || x.acc) || (x.account ? null : accs[0]);
    if (!ac) {
      skipped++;
      continue;
    }
    t.acc = ac.id;
    const k = key(t);
    if (seen.has(k)) {
      skipped++;
      continue;
    }
    seen.add(k);
    state.trades.push(t);
    added++;
  }
  state.accounts = accs;
  saveAccounts(accs);
  saveTrades(state.trades);
  return { added, skipped };
}
/* ------------------------------------------------------------------------- *
 *  CSV içe aktarma (MT5 / TradingView / Excel / Ascentia'nın kendi dışa aktarımı)
 * ------------------------------------------------------------------------- */

/**
 * Başlık eşanlamlıları (küçük harf). Anahtar = bizim alan adı, değer = kabul edilen sütun başlıkları.
 * Alan adının kendisi de başlık olarak kabul edilir.
 */
const CSV_ALIASES = {
  tarih: [
    "open time",
    "open date/time",
    "open date",
    "date",
    "time",
    "zaman",
    "tarih_saat",
    "datetime",
  ],
  cikis_tarihi: [
    "close time",
    "close date/time",
    "close date",
    "close datetime",
    "exit time",
    "exit date/time",
    "exit datetime",
    "cikis_tarihi",
    "çıkış zamanı",
    "çıkış tarihi",
    "cikis zamani",
    "cikis tarihi",
  ],
  yon: ["type", "direction", "side", "yon", "trend"],
  sembol: ["symbol", "ticker", "enstruman", "instrument", "pair"],
  hacim: ["volume", "size", "lot", "lots", "miktar", "quantity", "contract size"],
  giris: ["open price", "openprice", "open", "entry", "price", "acilis"],
  kapanis: ["close price", "closeprice", "close", "exit", "cikis"],
  komisyon: ["commission", "fee", "fees", "komisyon"],
  tp: ["t / p", "tp", "take profit", "takeprofit", "hedef", "target"],
  sl: ["s / l", "sl", "stop loss", "stoploss", "stop"],
};

/**
 * Başlık satırından sütun okuyucuları üretir.
 *  - field(satır, alan): alanın başlığı ya da eşanlamlılarından ilk DOLU olan sütunun değeri
 *  - exact(satır, başlık): yalnızca bu adlı sütunun değeri (Ascentia'nın kendi dışa aktarımı için)
 */
function csvColumns(headerRow) {
  const headers = headerRow.map(x => String(x).trim().toLocaleLowerCase("tr"));
  return {
    exact(row, name) {
      const i = headers.indexOf(name);
      return i >= 0 ? (row[i] ?? "") : "";
    },
    field(row, key) {
      for (const name of [key].concat(CSV_ALIASES[key] || [])) {
        const i = headers.indexOf(name);
        if (i >= 0 && row[i] != null && String(row[i]).trim() !== "") return row[i];
      }
      return "";
    },
  };
}

/** Komisyon (mutlak) − swap, 2 haneye yuvarlanır, negatife düşmez. Swap geliri maliyeti düşürür. */
function csvFees(commission, swap) {
  return Math.max(0, Math.round((Math.abs(commission || 0) - (swap || 0)) * 100) / 100);
}

/** Sembolün kontrat çarpanı (bilinmiyorsa 1). */
function symbolMultiplier(symbol) {
  const info = SYMS.find(x => x[0] === symbol);
  return info ? info[1] : 1;
}

/** "Plan" sütunu: evet/uydu/yes/1 → "evet", "hayır" → "hayır", diğerleri → "". */
function csvPlan(value) {
  const text = String(value || "").trim();
  if (["evet", "uydu", "yes", "1"].includes(text.toLocaleLowerCase("tr"))) return "evet";
  return text === "hayır" ? "hayır" : "";
}

/**
 * Tek CSV satırını işleme çevirir.
 * Başarıda { rec }, atlanacaksa { error: "neden" } döner.
 * resolveAccount(ad): hesabı bulur ya da oluşturur (satır geçerli olunca çağrılır).
 */
function parseCsvRow(row, col, resolveAccount) {
  const symbol = String(col.field(row, "sembol") || "")
    .trim()
    .toUpperCase();
  const dateRaw = String(col.field(row, "tarih") || "").trim();
  const date = toStamp(dateRaw);
  if (!symbol) return { error: "sembol sütunu bulunamadı" };
  if (!dateRaw) return { error: "tarih sütunu yok veya boş" };
  if (!date) return { error: "tarih okunamadı: " + dateRaw };

  // Yön yalnızca açıkça yazılmışsa okunur. Fiyattan tahmin edilmez: zararla kapanan bir long
  // işlem short sanılır ve P&L işareti ters çıkardı.
  const dirRaw = String(col.field(row, "yon") || "")
    .trim()
    .toLocaleLowerCase("tr");
  if (!dirRaw) return { error: "yön sütunu yok (Type/Direction/Side)" };
  const dir = ["short", "sell"].includes(dirRaw) ? "SHORT" : "LONG";

  const exitRaw = col.field(row, "kapanis");
  const exit = num(exitRaw);
  if (exitRaw && exit == null) return { error: "kapanış fiyatı sayı değil" };
  const qty = num(col.field(row, "hacim"));
  if (qty == null) return { error: "hacim/lot bulunamadı" };

  const rec = {
    id: newId(),
    date,
    symbol,
    dir,
    entry: num(col.field(row, "giris")),
    exit,
    qty,
    stop: num(col.field(row, "sl")),
    tp: num(col.field(row, "tp")),
    fees: csvFees(num(col.field(row, "komisyon")), num(col.exact(row, "swap"))),
    mult: num(col.exact(row, "carpan")) || symbolMultiplier(symbol),
    fx: num(col.exact(row, "kur")) || 1,
    acc: resolveAccount(col.exact(row, "hesap").trim()).id,
    exitDate: toStamp(col.field(row, "cikis_tarihi")),
    plan: csvPlan(col.exact(row, "plan")),
    mist: String(col.exact(row, "hata") || "").trim(),
    setup: String(col.exact(row, "setup") || "").trim(),
    emo: String(col.exact(row, "duygu") || "").trim(),
    notes: String(col.exact(row, "not") || "").trim(),
    stop0: num(col.exact(row, "ilk_stop")),
    rt: num(col.exact(row, "puan")),
  };
  if (rec.exitDate && rec.exitDate < rec.date) return { error: "çıkış zamanı girişten önce" };
  if (rec.exit == null) rec.exitDate = ""; // açık işlemde çıkış zamanı olmaz
  const invalid = validate(rec);
  return invalid ? { error: invalid } : { rec };
}

/**
 * Kapanmış, kotasyon para birimi USD olmayan bir forex işlemi kur (P&L kuru) olmadan içe
 * aktarıldıysa sonuç yanlış olabilir; kullanıcı uyarılır.
 */
function missingFxRate(rec, fxRaw) {
  const info = SYMS.find(x => x[0] === rec.symbol);
  return (
    !!info &&
    info[2] === "Forex" &&
    !rec.symbol.endsWith("USD") &&
    num(fxRaw) == null &&
    rec.exit != null
  );
}

/**
 * CSV metnini içe aktarır. Durumu (state) değiştirmez: yeni hesapları kaydeder, işlem listesini
 * `trades` olarak döndürür (çağıran state.trades'e atar ve kaydeder).
 * Dönüş: { added, skipped, why (ilk atlama nedeni), nofx (kur uyarısı sayısı), trades }
 */
function importCsv(text) {
  const rows = parseCsv(text);
  if (rows.length < 2) {
    return { added: 0, skipped: 0, why: "CSV boş görünüyor", nofx: 0, trades: state.trades };
  }
  const col = csvColumns(rows[0]);
  const accounts = state.accounts.slice();

  // Hesap adı → hesap. Ad boşsa ilk hesap; bilinmiyorsa yeni hesap oluşturulur.
  const resolveAccount = name => {
    const lower = name.toLocaleLowerCase("tr");
    let account = name ? accounts.find(a => a.name.toLocaleLowerCase("tr") === lower) : null;
    if (name && !account) {
      account = { id: "a" + newId(), name, balance: 0, dl: 0, md: 0, cur: "" };
      accounts.push(account);
    }
    return account || accounts[0];
  };
  // Aynı işlemi iki kez eklememek için kimlik anahtarı
  const dupKey = t => [t.date, t.symbol, t.dir, t.entry, t.qty, t.acc || accounts[0].id].join("|");
  const seen = new Set(state.trades.map(dupKey));
  const trades = state.trades.slice();

  let added = 0,
    skipped = 0,
    why = null,
    nofx = 0;
  const skip = reason => {
    skipped++;
    why = why || reason;
  };

  for (const row of rows.slice(1)) {
    if (!row.some(c => String(c || "").trim())) continue; // boş satır
    const { rec, error } = parseCsvRow(row, col, resolveAccount);
    if (error) {
      skip(error);
      continue;
    }
    const key = dupKey(rec);
    if (seen.has(key)) {
      skip("çift kayıt (aynen zaten var)");
      continue;
    }
    seen.add(key);
    trades.push(rec);
    added++;
    if (missingFxRate(rec, col.exact(row, "kur"))) nofx++;
  }
  state.accounts = accounts;
  saveAccounts(accounts);
  state.trades = trades;
  return { added, skipped, why, nofx, trades };
}
