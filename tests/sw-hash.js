// sw.js ASSETS listesindeki dosyaların içerik özeti. `npm run stamp` bunu sw.js'e yazar;
// tests/run.js eskiyse kırılır. (Önbellek adı özetten türer: dosya değişince ad değişir.)
const fs = require("fs"),
  path = require("path"),
  crypto = require("crypto");

function assetList(root) {
  const sw = fs.readFileSync(path.join(root, "sw.js"), "utf8");
  const block = /const ASSETS = \[([\s\S]*?)\];/.exec(sw);
  if (!block) throw new Error("sw.js içinde ASSETS listesi bulunamadı");
  // "./" (sayfa kökü) index.html ile aynı dosyadır, ayrıca sayılmaz
  return [...block[1].matchAll(/"\.\/([^"]+)"/g)].map(m => m[1]);
}

function assetHash(root) {
  const h = crypto.createHash("sha256");
  for (const f of assetList(root).sort()) {
    h.update(f + "\0");
    h.update(fs.readFileSync(path.join(root, f)));
    h.update("\0");
  }
  return h.digest("hex").slice(0, 12);
}

module.exports = { assetList, assetHash };
