#!/usr/bin/env node
// Uygulama dosyaları değişince çalıştır: `npm run stamp`. sw.js içindeki ASSET_HASH ve index.html'deki
// CSP betik özetini günceller. Böylece service worker yeni sürümü fark eder ve önbellek yenilenir.
const fs = require("fs"),
  path = require("path"),
  crypto = require("crypto");
const { assetHash } = require("./sw-hash");

const ROOT = path.resolve(__dirname, "..");

// 1) index.html içindeki tek satır betiğin CSP özeti (script-src 'sha256-…')
const htmlFile = path.join(ROOT, "index.html");
let html = fs.readFileSync(htmlFile, "utf8");
const inline = /<script>([\s\S]*?)<\/script>/.exec(html);
if (inline) {
  const digest = crypto.createHash("sha256").update(inline[1]).digest("base64");
  html = html.replace(/'sha256-[A-Za-z0-9+/=]+'/, "'sha256-" + digest + "'");
  fs.writeFileSync(htmlFile, html);
}

// 2) sw.js: index.html artık son hâlinde olduğu için özet en son hesaplanır
const swFile = path.join(ROOT, "sw.js");
const sw = fs.readFileSync(swFile, "utf8");
const hash = assetHash(ROOT);
const next = sw.replace(/const ASSET_HASH = "[0-9a-f]*";/, `const ASSET_HASH = "${hash}";`);
if (next === sw) console.log("sw.js zaten güncel (" + hash + ")");
else {
  fs.writeFileSync(swFile, next);
  console.log("sw.js ASSET_HASH = " + hash);
}
