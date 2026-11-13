#!/usr/bin/env node
// Lint: `node tests/lint.js`  (ya da `npm run lint`)
//
// js/ dosyaları index.html'deki sırayla yüklenir ve TEK ortak global kapsamı paylaşır. Dosyaları
// tek tek lint'lemek "tanımsız değişken" kuralını anlamsızlaştırır (başka dosyadaki fonksiyon
// tanımsız görünür). Bu yüzden önce index.html'deki sırayla birleştirir, ESLint'in kendi kapsam
// analizine verir, sonra hataları asıl dosya ve satıra çevirip yazarız. Böylece:
//   - tanımsız bir ad (yazım hatası, silinmiş fonksiyon) hata olur,
//   - hiçbir yerden çağrılmayan üst düzey fonksiyon/değişken uyarı olur,
//   - iki dosyada aynı üst düzey ad tanımlanırsa hata olur (tarayıcıda da SyntaxError verir).
const fs = require("fs");
const path = require("path");
const { ESLint } = require("eslint");

const ROOT = path.resolve(__dirname, "..");
const html = fs.readFileSync(path.join(ROOT, "index.html"), "utf8");
const files = [...html.matchAll(/<script src="(js\/[^"]+)"/g)].map(m => m[1]);
if (!files.length) throw new Error("index.html içinde js/ betiği bulunamadı");

let code = "";
const ranges = []; // her dosyanın birleşik koddaki satır aralığı
for (const f of files) {
  const text = fs.readFileSync(path.join(ROOT, f), "utf8").replace(/\n$/, "");
  const start = code ? code.split("\n").length + 1 : 1;
  ranges.push({ file: f, start, end: start + text.split("\n").length - 1 });
  code += (code ? "\n" : "") + text;
}

(async () => {
  const eslint = new ESLint({
    cwd: ROOT,
    overrideConfig: [
      {
        files: ["js/**/*.js"],
        rules: {
          "no-undef": "error",
          "no-unused-vars": ["warn", { vars: "all", args: "none", caughtErrors: "none" }],
        },
      },
    ],
  });
  const [result] = await eslint.lintText(code, { filePath: path.join(ROOT, "js/__birlesik__.js") });
  const where = line => {
    const r = ranges.find(x => line >= x.start && line <= x.end);
    return r ? `${r.file}:${line - r.start + 1}` : `birleşik:${line}`;
  };
  for (const m of result.messages) {
    const level = m.severity === 2 ? "hata " : "uyarı";
    console.log(`${level}  ${where(m.line).padEnd(24)} ${m.message}  (${m.ruleId})`);
  }
  console.log(
    `\n${files.length} dosya birleştirildi · ${result.errorCount} hata, ${result.warningCount} uyarı`
  );
  process.exit(result.errorCount ? 1 : 0);
})();
