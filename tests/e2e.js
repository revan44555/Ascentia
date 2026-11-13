// Gerçek Chromium (Playwright) uçtan uca testi: bağımlılıksız statik sunucu açar, 390px mobil görünümde
// gerçek tıklamalarla ana akışları sınar. Çalıştır: npm run test:e2e
// Tarayıcı Asia/Baku saatinde açılır; beklenen zamanlar da aynı saat diliminde hesaplansın (CI UTC çalışır)
process.env.TZ = "Asia/Baku";
const { chromium } = require("playwright");
const http = require("http"),
  fs = require("fs"),
  path = require("path");
const ROOT = path.join(__dirname, "..");
const MIME = {
  ".html": "text/html",
  ".js": "text/javascript",
  ".css": "text/css",
  ".json": "application/json",
  ".png": "image/png",
};
const srv = http.createServer((q, r) => {
  let p = q.url.split("?")[0];
  if (p.endsWith("/")) p += "index.html";
  const f = path.join(ROOT, p);
  fs.readFile(f, (e, d) => {
    if (e) {
      r.writeHead(404);
      r.end();
      return;
    }
    r.writeHead(200, { "content-type": MIME[path.extname(f)] || "x" });
    r.end(d);
  });
});
const iso = min => {
  const d = new Date(Date.now() - min * 6e4);
  d.setMinutes(d.getMinutes() - d.getTimezoneOffset());
  return d.toISOString().slice(0, 16);
};
const mkTrade = (i, o = {}) => ({
  id: "s" + i,
  date: iso(300 + i * 5),
  exitDate: iso(200 + i * 5),
  symbol: i % 2 ? "EURUSD" : "NAS100",
  dir: "LONG",
  entry: 1.1,
  exit: i % 2 ? 1.103 : 1.097,
  qty: 1,
  stop: 1.095,
  fees: 2,
  mult: 100000,
  fx: 1,
  acc: "a1",
  plan: "evet",
  setup: i % 2 ? "Breakout" : "Pullback",
  emo: "Sakin",
  qc: i === 0 ? 0 : 1,
  ...o,
});
let pass = 0,
  fail = 0;
const ok = (n, c, d) => {
  c ? pass++ : fail++;
  console.log((c ? "  ✓ " : "  ✗ ") + n + (c ? "" : "  → " + d));
};
(async () => {
  await new Promise(r => srv.listen(0, r));
  const base = "http://localhost:" + srv.address().port + "/";
  const b = await chromium.launch();
  const ctx = await b.newContext({
    viewport: { width: 390, height: 844 },
    timezoneId: "Asia/Baku",
  });
  const page = await ctx.newPage();
  const errs = [];
  page.on("pageerror", e => errs.push(e.message));
  page.on("dialog", d => d.accept(d.type() === "prompt" ? "SİL" : undefined));
  await page.addInitScript(
    ([t]) => {
      if (!localStorage.getItem("tj_trades_v1")) {
        localStorage.setItem("tj_trades_v1", JSON.stringify(t));
        localStorage.setItem(
          "tj_acc_v1",
          JSON.stringify([{ id: "a1", name: "Ana", balance: 10000, cur: "USD" }])
        );
      }
    },
    [Array.from({ length: 12 }, (_, i) => mkTrade(i))]
  );
  await page.goto(base);
  await page.waitForSelector("#view .card");
  // 1) Anı değerlendir: duygu düğmesi + kaydet
  await page.click('[data-qcemo="FOMO"]');
  ok(
    "qc duygu düğmesi seçilir (aria-pressed)",
    (await page.locator('[data-qcemo="FOMO"]').getAttribute("aria-pressed")) === "true"
  );
  await page.click('[data-act="qcsave"]');
  await page.waitForTimeout(200);
  ok(
    "qc kaydedildi (emo=FOMO, qc=1, kart kalktı)",
    (await page.evaluate(() => state.trades[0].emo === "FOMO" && state.trades[0].qc === 1)) &&
      (await page.locator("text=Anı değerlendir").count()) === 0
  );
  // 2) Ekle formu: yön, ayrıntılar, chip aç/kapa, hızlı zaman
  await page.goto(base + "#/add");
  await page.waitForSelector('[data-f="symbol"]');
  await page.click('[data-chip="dir"][data-v="SHORT"]');
  ok("yön chip: SHORT", (await page.evaluate(() => form.dir)) === "SHORT");
  await page.click('[data-act="togglemore"]');
  await page.waitForSelector('[data-chip="setup"]');
  await page.click('[data-chip="setup"] >> nth=0');
  const s1 = await page.evaluate(() => form.setup);
  await page.click('[data-chip="setup"] >> nth=0');
  const s2 = await page.evaluate(() => form.setup);
  ok("setup chip seçilir, tekrar basınca kalkar", !!s1 && s2 === "", JSON.stringify([s1, s2]));
  await page.click('[data-chip="rt"][data-v="4"]');
  ok("puan chip (render ile)", (await page.evaluate(() => form.rt)) === "4");
  await page.click('[data-qd="60"]');
  const dv = await page.inputValue('[data-f="date"]');
  ok("hızlı zaman: 1 sa önce", dv.length === 16 && dv < iso(0), dv);
  await page.click('[data-qx="60"]');
  ok("hızlı çıkış zamanı doldu", (await page.inputValue('[data-f="exitDate"]')).length === 16);
  // 3) İşlemler listesi: filtre chip, arama, daha fazla
  await page.goto(base + "#/trades");
  await page.waitForSelector("#tradeList .card");
  const all = await page.locator("#tradeList .trade-card").count();
  await page.click('summary:has-text("Filtreler")');
  await page.click('[data-lchip="result:win"]');
  const win = await page.locator("#tradeList .trade-card").count();
  ok("filtre chip: Kazanan listeyi daraltır", win > 0 && win < all, all + "→" + win);
  await page.click('[data-lchip="result:win"]');
  ok(
    "aynı chip tekrar: filtre kalkar",
    (await page.locator("#tradeList .trade-card").count()) === all
  );
  await page.click('[data-rng="7"]');
  ok("aralık chip", (await page.evaluate(() => RANGE)) === "7");
  await page.click('[data-rng="all"]');
  // 4) Analiz sekmeleri + takvim
  await page.goto(base + "#/insights");
  await page.waitForSelector("[data-itab]");
  for (const t of ["zaman", "strateji", "davranis", "ozet"]) {
    await page.click('[data-itab="' + t + '"]');
    ok("analiz sekmesi: " + t, (await page.evaluate(() => INS_TAB)) === t);
  }
  await page.click('[data-itab="zaman"]');
  await page.click('[data-act="calprev"]');
  const mo = await page.evaluate(() => calOff);
  ok("takvim önceki ay", mo === -1);
  await page.click('[data-act="calnext"]');
  // 5) Ayarlar: tema, hesap ekle/sil, gizle
  await page.goto(base + "#/more");
  await page.waitForSelector('[data-act="theme"]');
  await page.click('[data-act="theme"][data-v="light"]');
  ok("tema: açık", await page.evaluate(() => document.documentElement.classList.contains("light")));
  await page.click('[data-act="theme"][data-v="dark"]');
  await page.goto(base + "#/more/accounts");
  await page.fill("[data-newacc]", "Prop");
  await page.click('[data-act="addacc"]');
  await page.waitForTimeout(150);
  ok("hesap eklendi", (await page.evaluate(() => state.accounts.length)) === 2);
  await page.click('[data-act="delacc"] >> nth=1');
  await page.waitForTimeout(250);
  ok("boş hesap silindi", (await page.evaluate(() => state.accounts.length)) === 1);
  // 6) Ana ekran: P&L gizle
  await page.goto(base);
  await page.waitForSelector('[data-act="hidepl"]');
  await page.click('[data-act="hidepl"]');
  ok("P&L gizle", (await page.locator(".pl-hide").count()) > 0);
  await page.click('[data-act="hidepl"]');
  // 7) İşlem detayı: kopyala, sil + geri al
  await page.goto(base + "#/trades/s3");
  await page.waitForSelector('[data-act="clone"]');
  await page.click('[data-act="clone"]');
  await page.waitForSelector('[data-f="symbol"]');
  ok(
    "kopyala: form açıldı, id yok",
    await page.evaluate(() => form && !form.id && form.symbol === "EURUSD")
  );
  await page.goto(base + "#/trades/s3");
  await page.waitForSelector('[data-act="deltrade"]');
  const n0 = await page.evaluate(() => state.trades.length);
  await page.click('[data-act="deltrade"]');
  await page.waitForTimeout(300);
  ok("sil", (await page.evaluate(() => state.trades.length)) === n0 - 1);
  await page.click(".toast-act");
  await page.waitForTimeout(200);
  ok("geri al", (await page.evaluate(() => state.trades.length)) === n0);
  // 8) Veri: CSV dışa aktar, yedek indir
  await page.goto(base + "#/more/data");
  await page.waitForSelector('[data-act="csvexport"]');
  const [dl] = await Promise.all([
    page.waitForEvent("download"),
    page.click('[data-act="csvexport"]'),
  ]);
  ok("CSV indirilir", /ascentia-islemler\.csv$/.test(dl.suggestedFilename()));
  const [dl2] = await Promise.all([
    page.waitForEvent("download"),
    page.click('[data-act="jsonexport"] >> nth=0'),
  ]);
  ok("JSON yedek indirilir", /ascentia-defter\.json$/.test(dl2.suggestedFilename()));
  // 9) Etiket ekle/sil
  await page.goto(base + "#/more/tags");
  await page.fill('[data-newtag="setups"]', "Yeni-S");
  await page.click('[data-act="addtag"][data-kind="setups"]');
  await page.waitForTimeout(150);
  ok("etiket eklendi", await page.evaluate(() => state.tags.setups.includes("Yeni-S")));
  await page.click('[data-act="deltag"][data-v="Yeni-S"]');
  ok("etiket silindi", !(await page.evaluate(() => state.tags.setups.includes("Yeni-S"))));
  // 10) Açık pozisyonu kapat (tam + kısmi)
  await page.evaluate(() => {
    state.trades.push(
      normTrade({
        id: "op1",
        date: "2026-11-10T10:00",
        symbol: "EURUSD",
        entry: 1.1,
        qty: 3,
        stop: 1.095,
        mult: 100000,
        acc: "a1",
      })
    );
    saveTrades(state.trades);
  });
  await page.goto(base + "#/trades/op1");
  await page.waitForSelector("#cx");
  await page.fill("#cx", "1.105");
  await page.fill("#cq", "1");
  await page.click('[data-act="closetrade"]');
  await page.waitForTimeout(250);
  ok(
    "kısmi kapanış: kalan 2",
    (await page.evaluate(() => state.trades.find(t => t.id === "op1").qty)) === 2
  );
  await page.fill("#cx", "1.106");
  await page.click('[data-act="closetrade"]');
  await page.waitForTimeout(250);
  ok(
    "tam kapanış",
    (await page.evaluate(() => state.trades.find(t => t.id === "op1").exit)) === 1.106
  );
  ok("sayfa hatası yok", errs.length === 0, errs.join("|"));
  console.log("\n" + pass + " geçti, " + fail + " kaldı");
  await b.close();
  srv.close();
  process.exit(fail ? 1 : 0);
})().catch(e => {
  console.error("BETİK HATASI", e.message);
  process.exit(2);
});
