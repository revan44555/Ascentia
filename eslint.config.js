// ESLint (flat config) — biçim/doğruluk kuralları.
//
// js/ dosyaları tek ortak global kapsamı paylaşır; bu yüzden dosya başına lint'te "no-undef"
// kapalıdır (başka dosyadaki fonksiyonu tanımsız sanırdı, editörde sahte hata gösterirdi).
// Tanımsız / kullanılmayan ad kontrolü js/ dosyalarını birleştirip yapan `node tests/lint.js`
// betiğindedir (npm run lint ikisini de çalıştırır).

const browserGlobals = Object.fromEntries(
  [
    "window",
    "document",
    "localStorage",
    "sessionStorage",
    "location",
    "navigator",
    "indexedDB",
    "URL",
    "URLSearchParams",
    "Blob",
    "File",
    "FileReader",
    "Intl",
    "createImageBitmap",
    "requestAnimationFrame",
    "MutationObserver",
    "IntersectionObserver",
    "performance",
    "confirm",
    "prompt",
    "alert",
    "setTimeout",
    "clearTimeout",
    "setInterval",
    "clearInterval",
    "console",
    "fetch",
    "self",
    "caches",
    "clients",
    "structuredClone",
  ].map(name => [name, "readonly"])
);

module.exports = [
  {
    files: ["js/**/*.js", "sw.js"],
    languageOptions: {
      ecmaVersion: 2022,
      sourceType: "script",
      globals: browserGlobals,
    },
    rules: {
      "no-undef": "off",
      "no-unused-vars": ["warn", { vars: "local", args: "none", caughtErrors: "none" }],
      "no-redeclare": ["error", { builtinGlobals: false }],
      "no-var": "error",
      // prefer-const kapalı: form, RANGE, EQ gibi ortak globaller başka dosyada yeniden atanıyor
      "prefer-const": "off",
      eqeqeq: ["warn", "always", { null: "ignore" }],
      "no-empty": ["warn", { allowEmptyCatch: true }],
      "no-self-assign": "error",
      "no-dupe-keys": "error",
      "no-unreachable": "error",
      "no-constant-condition": "warn",
    },
  },
  {
    files: ["tests/**/*.js", "eslint.config.js"],
    languageOptions: {
      ecmaVersion: 2022,
      sourceType: "commonjs",
      globals: {
        require: "readonly",
        process: "readonly",
        __dirname: "readonly",
        console: "readonly",
        clearTimeout: "readonly",
        URLSearchParams: "readonly",
        module: "writable",
        setTimeout: "readonly",
        structuredClone: "readonly",
        Buffer: "readonly",
      },
    },
    rules: {
      "no-undef": "error",
      "no-unused-vars": ["warn", { args: "none", caughtErrors: "none" }],
      "no-var": "error",
    },
  },
  {
    // page.evaluate(() => ...) içindeki kod tarayıcıda çalışır; uygulama globalleri orada tanımlıdır
    files: ["tests/e2e.js"],
    rules: { "no-undef": "off" },
  },
];
