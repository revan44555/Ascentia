#!/usr/bin/env node
// Ascentia test runner. Bağımlılık yok: `node tests/run.js [repo-klasörü]`
// Gerçek js/ dosyalarını index.html'deki sırayla bir sandbox'a yükler (tarayıcı/DOM sahte).
"use strict";
const vm = require("vm"), fs = require("fs"), path = require("path");
const DIR = path.resolve(process.argv[2] || path.join(__dirname, ".."));
const FILES = ["utils", "calc", "storage", "symbols", "ui", "view-home", "view-add", "view-insights", "view-more", "app"];
const sleep = ms => new Promise(r => setTimeout(r, ms));

process.on("unhandledRejection", () => {}); // sahte DOM'dan gelen gürültüyü yut

function newStore() { return { ls: {}, idb: new Map(), lsFail: new Set(), idbFail: new Set(), idbHang: false, log: [] }; }

function load(store) {
  store = store || newStore();
  const env = { store, prompts: [], toasts: [] };
  const stub = new Proxy({}, {
    get: (t, p) => p === "classList" ? { add() {}, remove() {}, toggle() {}, contains() { return false } }
      : p === "style" ? { setProperty() {} } : p === "querySelectorAll" ? () => [] : p === "dataset" ? {} : () => stub,
    set: () => true
  });
  const ctx = {
    console, setTimeout, clearTimeout, URLSearchParams, structuredClone,
    localStorage: {
      getItem: k => (k in store.ls ? store.ls[k] : null),
      setItem: (k, v) => { if (store.lsFail.has(k)) throw new Error("quota"); store.ls[k] = String(v); store.log.push(k) }
    },
    sessionStorage: { getItem: () => null, setItem() {}, removeItem() {} },
    indexedDB: {
      open() {
        const req = {};
        setTimeout(() => {
          if (store.idbHang) return;
          const db = {
            createObjectStore() {},
            transaction() {
              const tx = {};
              tx.objectStore = () => ({
                put(v, k) { setTimeout(() => { if (store.idbFail.has(k)) tx.onerror && tx.onerror(); else { store.idb.set(k, structuredClone(v)); tx.oncomplete && tx.oncomplete() } }, 0); return {} },
                get(k) { const r = {}; setTimeout(() => { r.result = store.idb.has(k) ? structuredClone(store.idb.get(k)) : undefined; r.onsuccess && r.onsuccess() }, 0); return r }
              });
              return tx;
            }
          };
          req.result = db;
          req.onupgradeneeded && req.onupgradeneeded();
          req.onsuccess && req.onsuccess();
        }, 0);
        return req;
      }
    },
    document: { addEventListener() {}, getElementById: () => stub, querySelector: () => stub, querySelectorAll: () => [], documentElement: stub, body: stub, createElement: () => stub },
    window: { addEventListener() {}, scrollTo() {} },
    location: { hash: "#/", replace() {} },
    navigator: {}, requestAnimationFrame() {}, confirm: () => true,
    prompt: () => env.prompts.shift(),
    MutationObserver: class { observe() {} disconnect() {} }, IntersectionObserver: class { observe() {} }
  };
  vm.createContext(ctx);
  for (const f of FILES) {
    let src = fs.readFileSync(path.join(DIR, "js", f + ".js"), "utf8");
    if (f === "app") src = src.replace(/\(async function init\(\)\{([\s\S]*?)\}\)\(\);/, "globalThis.__init=async function(){$1};");
    vm.runInContext(src, ctx, { filename: f + ".js" });
  }
  const names = ["num", "pnl", "risk", "rr", "validate", "summarize", "breakdown", "adherence", "normTrade", "restoreJson", "importCsv", "loadAll",
    "saveTrades", "saveAccounts", "saveTags", "state", "sessionOf", "monthRows", "partialClose", "tradesToCsv", "backupJson", "render", "accountId", "DEFAULT_TAGS", "TRADES_KEY", "unitize"];
  const T = vm.runInContext("({" + names.map(n => `${n}:typeof ${n}!=='undefined'?${n}:undefined`).join(",") + "})", ctx);
  return { T, ctx, env, store };
}

// ---- mini test runner -------------------------------------------------------
const results = [];
const tests = [];
const test = (id, name, fn) => tests.push({ id, name, fn });
const eq = (a, b) => JSON.stringify(a) === JSON.stringify(b);
const near = (a, b, e = 1e-6) => a != null && Math.abs(a - b) <= e;
function expect(cond, detail) { if (!cond) throw new Error(detail || "beklenen sonuç yok"); }

const base = { id: "1", date: "2026-10-01T10:00", symbol: "EURUSD", dir: "LONG", entry: 1.1, exit: 1.105, qty: 1, stop: 1.095, stop0: null, tp: null, fees: 5, mult: 100000, fx: 1, acc: "a1", plan: "", mist: "", setup: "Breakout", emo: "", notes: "", exitDate: "2026-10-01T12:00", chk: null, rt: null };
const withAcc = T => { T.state.accounts = [{ id: "a1", name: "Ana", balance: 10000 }]; return T };

// ===== REGRESYON: doğru çalışan şeyler bozulmamış olmalı ========================
test("R", "Long P&L = 495, short = −505, R = 0,99", () => {
  const { T } = load(); withAcc(T);
  expect(T.pnl(base) === 495, "long pnl " + T.pnl(base));
  expect(T.pnl({ ...base, dir: "SHORT" }) === -505, "short pnl");
  expect(near(T.rr(base), 0.99, 1e-6), "R " + T.rr(base));
});
test("R", "Drawdown: +100,−300,+50,−100 → maxDD 350, %3,465, PF 0,375", () => {
  const { T } = load(); withAcc(T);
  const mk = (i, p) => ({ ...base, id: "t" + i, date: "2026-10-0" + i + "T10:00", exitDate: "2026-10-0" + i + "T11:00", exit: base.entry + p / 100000, fees: 0, stop: null });
  const ts = [100, -300, 50, -100].map((p, i) => mk(i + 1, p));
  T.state.trades = ts;
  const s = T.summarize(ts);
  expect(s.net === -250 && s.maxDd === 350 && near(s.ddPct, 3.4653, 1e-3) && near(s.profitFactor, 0.375), JSON.stringify([s.net, s.maxDd, s.ddPct, s.profitFactor]));
  expect(s.closed === 4 && s.wins === 2 && s.losses === 2 && s.streakWin === 1 && s.streakLoss === 1, "sayımlar");
});
test("R", "stop0 varken R, ilk stop üzerinden hesaplanır", () => {
  const { T } = load(); withAcc(T);
  const t = { ...base, stop: 1.102, stop0: 1.095 };
  expect(T.validate(t) === null, "validate: " + T.validate(t));
  expect(near(T.risk(t), 500, 1e-6) && near(T.rr(t), 0.99, 1e-6), "risk/R " + T.risk(t));
});
test("R", "Tüm ekranlar hatasız çiziliyor (smoke: 9 rota)", () => {
  const { T, ctx } = load(); withAcc(T);
  T.state.trades = [base, { ...base, id: "2", dir: "SHORT", exit: null, exitDate: "" }, { ...base, id: "3", exit: 1.09, setup: "Pullback", mist: "Erken giriş", plan: "hayır" }];
  for (const r of ["#/", "#/trades", "#/add", "#/insights", "#/more", "#/more/accounts", "#/more/tags", "#/more/data", "#/trades/1"]) { ctx.location.hash = r; ctx.render(); }
});
test("R", "Kendi CSV çıktısını geri alınca mükerrer eklemez, alanlar korunur", () => {
  const { T } = load(); withAcc(T);
  T.state.trades = [{ ...base, stop0: 1.095, stop: 1.1 }];
  const csv = T.tradesToCsv(T.state.trades);
  const r = T.importCsv(csv);
  expect(r.added === 0 && r.skipped === 1 && T.state.trades.length === 1, JSON.stringify(r));
});

// ===== 1) Oynatılmış / başabaş stop ============================================
test("1", "Kapanmış long, stop = giriş (başabaş), ilk stop yok → kabul", () => {
  const { T } = load(); withAcc(T);
  expect(T.validate({ ...base, stop: 1.1 }) === null, String(T.validate({ ...base, stop: 1.1 })));
});
test("1", "Kapanmış long, stop girişin üstüne çekilmiş → kabul", () => {
  const { T } = load(); withAcc(T);
  expect(T.validate({ ...base, stop: 1.102 }) === null, String(T.validate({ ...base, stop: 1.102 })));
});
test("1", "Açık/yeni long işlemde yanlış taraftaki stop hâlâ reddedilir", () => {
  const { T } = load(); withAcc(T);
  expect(typeof T.validate({ ...base, exit: null, exitDate: "", stop: 1.102 }) === "string", "reddedilmedi");
});
test("1", "stop0 yanlış taraftaysa (kapanmış olsa bile) reddedilir", () => {
  const { T } = load(); withAcc(T);
  expect(typeof T.validate({ ...base, stop0: 1.102 }) === "string", "reddedilmedi");
});
test("1", "risk(): kâr tarafına çekilmiş stop sahte risk üretmez (null)", () => {
  const { T } = load(); withAcc(T);
  expect(T.risk({ ...base, stop: 1.102 }) === null, "risk = " + T.risk({ ...base, stop: 1.102 }));
  expect(T.rr({ ...base, stop: 1.102 }) === null, "R sahte hesaplandı");
});
test("1", "CSV: S/L başabaşa çekilmiş MT5 satırı atlanmaz, R boş kalır", () => {
  const { T } = load(); withAcc(T);
  const csv = "Open Time,Symbol,Type,Volume,Open Price,S / L,T / P,Close Time,Close Price,Commission,Swap\n2026.10.01 10:00:00,EURUSD,buy,1,1.1000,1.1000,1.1100,2026.10.01 12:00:00,1.1050,-5,0\n";
  const r = T.importCsv(csv);
  expect(r.added === 1 && r.skipped === 0, JSON.stringify(r));
  expect(T.pnl(T.state.trades[0]) === 495 && T.rr(T.state.trades[0]) === null, "pnl/R");
});

// ===== 2) Sayı ayrıştırma ======================================================
test("2", "num(): TR ve EN binlik/ondalık biçimleri", () => {
  const { T } = load();
  const cases = [["1.234,56", 1234.56], ["1,234.50", 1234.5], ["1,234,567", 1234567], ["1.234.567", 1234567], ["0,0067", 0.0067], ["1234.5", 1234.5],
    ["1 234.50", 1234.5], ["1 234,50", 1234.5], ["-1,5", -1.5], ["25,100.50", 25100.5], ["", null], [" ", null], ["abc", null], [7, 7], [null, null]];
  const bad = cases.filter(([i, o]) => !(o === null ? T.num(i) === null : near(T.num(i), o, 1e-9))).map(([i, o]) => `${JSON.stringify(i)}→${T.num(i)} (beklenen ${o})`);
  expect(!bad.length, bad.join(" | "));
});
test("2", "CSV: \"25,100.50\" fiyatı 25100,5 olarak okunur (25,1 değil)", () => {
  const { T } = load(); withAcc(T);
  const csv = 'Open Time,Symbol,Type,Volume,Open Price,S / L,T / P,Close Time,Close Price\n2026.10.02 10:00:00,NAS100,sell,1,"25,100.50",25200,25000,2026.10.02 11:00:00,"25,000.00"\n';
  const r = T.importCsv(csv);
  const t = T.state.trades[0];
  expect(r.added === 1 && t && t.entry === 25100.5 && t.exit === 25000 && t.dir === "SHORT", JSON.stringify([r, t && t.entry, t && t.exit]));
  expect(T.pnl(t) === 100.5, "pnl " + (t && T.pnl(t)));
});

// ===== 3) normTrade / JSON geri yükleme ========================================
test("3", "dir: short/Short/sell/SELL → SHORT; buy/long → LONG", () => {
  const { T } = load();
  const d = x => T.normTrade({ ...base, dir: x }).dir;
  expect(["short", "Short", "sell", "SELL"].every(x => d(x) === "SHORT") && ["buy", "long", "LONG", ""].every(x => d(x) === "LONG"), ["short", "sell", "SELL", "buy"].map(d).join(","));
});
test("3", "Geçersiz sayılar düzeltilir: exit 0 → açık, fees<0 → 0, mult<0 → 1", () => {
  const { T } = load();
  const t = T.normTrade({ ...base, exit: 0, fees: -3, mult: -2 });
  expect(t.exit === null && t.fees === 0 && t.mult === 1, JSON.stringify([t.exit, t.fees, t.mult]));
});
test("3", "Tarih \"2026-10-01 10:00\" → \"2026-10-01T10:00\" (string karşılaştırması bozulmaz)", () => {
  const { T } = load();
  const t = T.normTrade({ ...base, date: "2026-10-01 10:00", exitDate: "2026-10-01 12:00" });
  expect(t.date === "2026-10-01T10:00" && t.exitDate === "2026-10-01T12:00", t.date + " / " + t.exitDate);
});
test("3", "JSON geri yükleme: elle yazılmış 'short' kaydı SHORT kalır, P&L işareti doğru", () => {
  const { T } = load();
  T.restoreJson({ trades: [{ ...base, dir: "short" }], accounts: [{ id: "a1", name: "Ana", balance: 0 }] }, true);
  expect(T.state.trades[0].dir === "SHORT" && T.pnl(T.state.trades[0]) === -505, "dir=" + T.state.trades[0].dir);
});

// ===== 4) Depolama =============================================================
test("4", "localStorage yazımı başarısız, IndexedDB başarılı → yeniden açınca GÜNCEL veri", async () => {
  const s = newStore();
  let a = load(s); withAcc(a.T);
  a.T.saveTrades([{ ...base, id: "A" }]); await sleep(40);
  s.lsFail.add("tj_trades_v1");
  a.T.saveTrades([{ ...base, id: "A" }, { ...base, id: "B" }]); await sleep(40);
  s.lsFail.clear();
  const b = load(s); await b.T.loadAll();
  expect(b.T.state.trades.length === 2, "yüklenen işlem sayısı " + b.T.state.trades.length + " (2 olmalı)");
});
test("4", "Anahtar başına zaman damgası: hesap kaydı, işlemlerin eski kopyasını 'yeni' göstermez", async () => {
  const s = newStore();
  let a = load(s); withAcc(a.T);
  a.T.saveTrades([{ ...base, id: "A" }]); await sleep(40);
  s.lsFail.add("tj_trades_v1");
  a.T.saveTrades([{ ...base, id: "A" }, { ...base, id: "B" }]); await sleep(40);
  s.lsFail.clear(); s.idbFail.add("accounts");
  a.T.saveAccounts([{ id: "a1", name: "Ana", balance: 5000 }]); await sleep(40);
  const b = load(s); await b.T.loadAll();
  expect(b.T.state.trades.length === 2, "yüklenen işlem sayısı " + b.T.state.trades.length + " (2 olmalı)");
});
test("4", "Önce veri, sonra tj_ts yazılır (diğer sekme eski veriyi okumaz)", () => {
  const s = newStore(); const a = load(s); withAcc(a.T);
  a.T.saveTrades([{ ...base }]);
  const i = s.log.indexOf("tj_trades_v1"), j = s.log.indexOf("tj_ts");
  expect(i >= 0 && j > i, "sıra: " + s.log.join(" → "));
});
test("4", "Etiketler localStorage silinse bile IndexedDB'den geri gelir", async () => {
  const s = newStore(); const a = load(s);
  a.T.saveTags({ setups: ["Özel-A"], emos: ["Sakin"], mists: ["Hata-X"], syms: ["ABC"] }); await sleep(40);
  delete s.ls["tj_tags_v1"];
  const b = load(s); await b.T.loadAll();
  expect(eq(b.T.state.tags.setups, ["Özel-A"]) && eq(b.T.state.tags.syms, ["ABC"]), "etiketler: " + JSON.stringify(b.T.state.tags.setups));
});
test("4", "IndexedDB açılışı takılırsa uygulama açılır (≤ 5 sn), veri localStorage'dan gelir", async () => {
  const s = newStore(); const a = load(s); withAcc(a.T);
  a.T.saveTrades([{ ...base, id: "A" }]); await sleep(40);
  s.idbHang = true;
  const b = load(s);
  const t0 = Date.now();
  const res = await Promise.race([b.T.loadAll().then(() => "ok"), sleep(6500).then(() => "TAKILDI")]);
  const dt = Date.now() - t0;
  expect(res === "ok" && dt <= 5200 && b.T.state.trades.length === 1, `sonuç=${res}, süre=${dt}ms, işlem=${b.T.state.trades.length}`);
});
test("4", "Normal kaydet → yeniden aç (regresyon)", async () => {
  const s = newStore(); const a = load(s); withAcc(a.T);
  a.T.saveTrades([{ ...base, id: "A" }, { ...base, id: "B" }]); a.T.saveAccounts([{ id: "a1", name: "Ana", balance: 777 }]); await sleep(40);
  const b = load(s); await b.T.loadAll();
  expect(b.T.state.trades.length === 2 && b.T.state.accounts[0].balance === 777, "kayıt/okuma");
});

// ===== 5) Kısmi kapatma ========================================================
function partialSetup(T, env) {
  withAcc(T);
  const parent = { ...base, id: "P", qty: 3, exit: null, exitDate: "", fees: 0, plan: "evet", rt: 4, chk: 3 };
  T.state.trades = [parent];
  env.prompts.push("1", "1.11");            // 1 lot @ 1.11 → +1000
  T.partialClose("P");
  const p = T.state.trades.find(t => t.id === "P"); p.exit = 1.098; p.exitDate = "2026-10-01T15:00"; // kalan 2 lot → −400
  return T.state.trades;
}
test("5", "Parçalı kapanış tek işlem sayılır (closed 1, win rate %100)", () => {
  const { T, env } = load(); const ts = partialSetup(T, env);
  const s = T.summarize(ts);
  expect(ts.length === 2 && s.closed === 1 && s.wins === 1 && s.losses === 0 && s.winRate === 100, `closed=${s.closed} wins=${s.wins} losses=${s.losses} winRate=${s.winRate}`);
});
test("5", "Net para değişmez (+1000 −400 = +600) ve R grup toplamı (600 / 1500 = 0,4R)", () => {
  const { T, env } = load(); const ts = partialSetup(T, env);
  const s = T.summarize(ts);
  expect(s.net === 600 && near(s.avgR, 0.4, 1e-6), `net=${s.net} avgR=${s.avgR}`);
});
test("5", "Dağılımlarda (setup) n = 1; aylık özette n = 1", () => {
  const { T, env } = load(); const ts = partialSetup(T, env);
  const b = T.breakdown(ts, "setup"), m = T.monthRows(ts);
  expect(b.length === 1 && b[0].n === 1 && b[0].net === 600 && m[0].n === 1 && m[0].net === 600, `breakdown n=${b[0] && b[0].n}, aylık n=${m[0] && m[0].n}`);
});
test("5", "Plan uyumu çift saymaz (tek işlem → <3 etiketli → null)", () => {
  const { T, env } = load(); const ts = partialSetup(T, env);
  const tagged = ts.filter(t => t.plan === "evet").length;
  expect(tagged === 2, "ön koşul");
  const base3 = [...ts, { ...base, id: "x1", plan: "hayır" }, { ...base, id: "x2", plan: "evet" }]; // gruplanınca 3 işlem: evet,hayır,evet
  const a = T.adherence(base3);
  expect(a !== null && near(a, 66.6667, 1e-3), "uyum = " + a + " (66,7 olmalı)");
});
test("5", "Çocuk kayıtta puan/kontrol listesi kopyalanmaz; grp ortak ve yedekten sonra korunur", () => {
  const { T, env, ctx } = load(); const ts = partialSetup(T, env);
  const child = ts.find(t => t.id !== "P"), parent = ts.find(t => t.id === "P");
  expect(child.rt === null && child.chk === null, "rt/chk kopyalandı");
  expect(parent.grp && parent.grp === child.grp, "grp yok/farklı");
  const raw = JSON.parse(T.backupJson());
  T.restoreJson(raw, true);
  const g = T.state.trades.map(t => t.grp);
  expect(g[0] && g[0] === g[1], "grp yedekte kayboldu");
});
test("5", "Kalan kısım açıkken: işlem 'açık' sayılır, gerçekleşen kâr net'e girer", () => {
  const { T, env } = load(); withAcc(T);
  T.state.trades = [{ ...base, id: "P", qty: 3, exit: null, exitDate: "", fees: 0 }];
  env.prompts.push("1", "1.11"); T.partialClose("P");
  const s = T.summarize(T.state.trades);
  expect(s.closed === 0 && s.open === 1 && s.net === 1000, `closed=${s.closed} open=${s.open} net=${s.net}`);
});
test("5", "Parçasız normal işlemler aynı kalır (2 işlem = 2)", () => {
  const { T } = load(); withAcc(T);
  const ts = [{ ...base, id: "a" }, { ...base, id: "b", exit: 1.09 }];
  const s = T.summarize(ts);
  expect(s.closed === 2 && s.wins === 1 && s.losses === 1 && T.breakdown(ts, "setup")[0].n === 2, "sayım");
});

test("5", "Formdan Düzenle→Kaydet: grp korunur, oynatılmış stop'lu kapanmış işlem kaydedilir (uçtan uca)", () => {
  const { T, ctx, env } = load(); partialSetup(T, env);
  vm.runInContext('form=fromTrade(state.trades.find(t=>t.id==="P"));form.__for="/add";form.stop="1.102";', ctx);
  ctx.saveForm();
  const p = T.state.trades.find(t => t.id === "P");
  expect(p && p.stop === 1.102, "kayıt reddedildi/değişmedi: stop=" + (p && p.stop));
  expect(p.grp === "P", "grp kayboldu: " + p.grp);
  const s = T.summarize(T.state.trades);
  expect(s.closed === 1, "düzenlemeden sonra closed=" + s.closed + " (1 olmalı)");
});

// ===== 6) İçe aktarma ayrıntıları ==============================================
const HDR = "Open Time,Symbol,Type,Volume,Open Price,S / L,T / P,Close Time,Close Price,Commission,Swap\n";
test("6", "Pozitif swap maliyeti düşürür (komisyon −5, swap +2 → 3); negatif swap eklenir", () => {
  const { T } = load(); withAcc(T);
  T.importCsv(HDR + "2026.10.01 10:00:00,EURUSD,buy,1,1.1000,1.0950,1.1100,2026.10.01 12:00:00,1.1050,-5,2\n2026.10.02 10:00:00,EURUSD,buy,1,1.1000,1.0950,1.1100,2026.10.02 12:00:00,1.1050,-5,-1.5\n");
  const f = T.state.trades.map(t => t.fees);
  expect(eq(f, [3, 6.5]), "fees=" + JSON.stringify(f));
});
test("6", "Swap geliri komisyonu aşarsa komisyon negatife düşmez (0'a kenetlenir), satır atlanmaz", () => {
  const { T } = load(); withAcc(T);
  const r = T.importCsv(HDR + "2026.10.01 10:00:00,EURUSD,buy,1,1.1000,1.0950,1.1100,2026.10.01 12:00:00,1.1050,-1,4\n");
  expect(r.added === 1 && T.state.trades[0].fees === 0, JSON.stringify([r, T.state.trades[0] && T.state.trades[0].fees]));
});
test("6", "Tarih sütunu yoksa işlem 'şimdi' tarihiyle eklenmez, atlanır ve neden söylenir", () => {
  const { T } = load(); withAcc(T);
  const r = T.importCsv("Symbol,Type,Volume,Open Price,Close Price\nEURUSD,buy,1,1.1000,1.1050\n");
  expect(r.added === 0 && r.skipped === 1 && /tarih/i.test(r.why || ""), JSON.stringify(r));
});
test("6", "Yalnız tarih (2026.10.01) olan satır 00:00 ile kabul edilir", () => {
  const { T } = load(); withAcc(T);
  const r = T.importCsv("Date,Symbol,Type,Volume,Open Price,Close Price\n2026.10.01,EURUSD,buy,1,1.1000,1.1050\n");
  expect(r.added === 1 && T.state.trades[0].date === "2026-10-01T00:00", JSON.stringify([r, T.state.trades[0] && T.state.trades[0].date]));
});

// ---- çalıştır ----------------------------------------------------------------
(async () => {
  console.log("Repo: " + DIR + "\n");
  let pass = 0, fail = 0;
  for (const t of tests) {
    try { await t.fn(); pass++; console.log("  ✓ [" + t.id + "] " + t.name); }
    catch (e) { fail++; console.log("  ✗ [" + t.id + "] " + t.name + "\n        → " + (e && e.message)); }
  }
  console.log(`\n${pass} geçti, ${fail} kaldı (toplam ${tests.length})`);
  process.exit(fail ? 1 : 0);
})();
