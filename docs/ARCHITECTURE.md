# Mimari ve yeni özellik ekleme rehberi

Ascentia derleme adımı olmayan, sunucusuz bir PWA'dır. Amaç: **yeni bir özellik eklemek için mevcut dosyalara dokunmamak.**
Bunu birkaç kural ve küçük bir çekirdek (`js/core.js`) sağlar; kuralları `npm test` içindeki G1–G7 testleri korur.

## Katmanlar

```
            ┌──────────────── js/app.js ────────────────┐   açılış + render() + tek olay dinleyicisi
            │                                           │
   js/view-*.js  ──►  js/ui.js, js/services.js  ──►  js/calc.js, js/symbols.js, js/utils.js
   (ekranlar)             (ortak parçalar)              (saf hesap: DOM yok, durum yok)
            │                                           ▲
            └──────────►  js/core.js  ◄──────────  js/storage.js
                     (yol · eylem · olay · menü)     (depolama: ekranı bilmez)
```

| Dosya                               | Sorumluluk                                                                      | Bilmediği şey                  |
| ----------------------------------- | ------------------------------------------------------------------------------- | ------------------------------ |
| `core.js`                           | Kayıt defteri: yol, menü, eylem, tıklama, olay                                  | Hiçbir ekranı                  |
| `utils.js`, `calc.js`, `symbols.js` | Biçimlendirme, P&L/R/istatistik, sembol verisi                                  | DOM, `state`, ekranlar         |
| `storage.js`                        | localStorage + IndexedDB, yedek, içe aktarma; `state` nesnesi                   | Ekranlar (yalnızca olay yayar) |
| `services.js`                       | Birden çok ekranın kullandığı işler (CSV üretimi, etiket ekleme, dosya indirme) | Ekranlar                       |
| `ui.js`                             | Ortak küçük bileşenler (kpi, rozet, toast, tarih aralığı chip'leri)             | Ekranlar                       |
| `view-*.js`                         | Bir ekranın HTML'i + yolu + eylemleri + **kendi durumu**                        | Başka ekranın durumu           |
| `app.js`                            | Açılış, `render()`, olayları `Core`'a yönlendiren tek dinleyici                 | Özelliklerin içi               |

## Altı kural

1. **Ekran kendini kaydeder.** `Core.route / nav / action / click / listen` ile. `app.js`, `index.html` menüsü, `ACTIONS` tablosu gibi merkezi bir yer yoktur.
2. **Yalnızca `app.js` `render()` çağırır.** Ekranlar `Core.refresh()`, depolama `Core.emit("data:changed")` der. (G1)
3. **Her ekran durumunun tek sahibi vardır.** `form`, `INS_TAB`, `qcEmo` gibi değişkenler yalnız kendi dosyasında atanır; başka ekran ihtiyaç duyarsa olay veya `services.js` kullanır. (G3)
4. **Saf katmanlar ekranı bilmez.** `calc.js`, `utils.js`, `symbols.js`, `storage.js` içinde `view…` ya da `Core.route/nav/action` geçmez. (G2)
5. **Yeni dosya IIFE içinde yazılır** (`(() => { … })();`). Tüm klasik betikler tek global kapsamı paylaşır; aynı üst düzey ad iki dosyada tanımlanırsa sayfa açılmaz (`npm run lint` bunu da yakalar).
6. **Her betik üç yerde listelenir:** `index.html`, `sw.js` `ASSETS` (+ `CACHE` sürümünü artır), `tests/run.js` `FILES`. Unutulursa G4 kırılır.

## Core API

```js
Core.route("/risk", { nav: "/risk", view: ctx => "<section>…</section>", enter: ctx => {} });
//   desen: "/trades/:id" → ctx.args.id ; ctx.params = ?a=b sorgusu ; nav = menüde parlayacak yol
Core.nav({ path: "/risk", label: "Risk", order: 25, side: "<path …/>", bottom: "<path …/>" });
//   side/bottom: svg iç etiketleri (24×24, çizgi). order: sıralama (Bugün 10 … Daha 50). cls: "add" → vurgulu düğme
Core.action("risk-hesapla", el => { … Core.refresh(); });         // <button data-act="risk-hesapla">
Core.click("riskchip", { when: el => …, run: el => … });          // <button data-riskchip="x">  (sıra önemli)
Core.listen("input" | "change" | "keydown", e => { … return true; }); // true → olay işlendi, sonrakilere gitmez
Core.on("saved:trades", trades => { … });  Core.emit("benim:olay", veri);
Core.refresh();                                                    // ekranı yeniden çiz
```

Güvenceler: aynı yol/eylem iki kez kaydedilirse **hata** verir; bir olay işleyicisi hata verirse diğerleri çalışmaya devam eder.

### Olaylar

| Olay                                             | Ne zaman                                                                | Veri       |
| ------------------------------------------------ | ----------------------------------------------------------------------- | ---------- |
| `view:refresh`                                   | Bir ekran yeniden çizim ister (`Core.refresh()`)                        | —          |
| `data:changed`                                   | Depolama verisi dışarıdan değişti (geri yükleme, dosya, sekme senkronu) | —          |
| `saved:trades` / `saved:accounts` / `saved:tags` | İlgili veri kaydedildi                                                  | yeni liste |
| `navigate`                                       | Adres (`#…`) değişti, ekran çizilmeden önce                             | yeni hash  |

## Tarif: yeni bir ekran eklemek (örnek: "Lot hesaplayıcı")

1. `js/view-risk.js` oluştur:

```js
"use strict";
// Yeni dosya bir IIFE içinde yazılır: tek global kapsamda başka dosyayla ad çakışması olmaz
// (ör. `riskPct` zaten calc.js'te tanımlı; IIFE olmadan sayfa SyntaxError ile açılmaz).
(() => {
  let riskPercent = 1; // bu ekranın durumu — dışarıdan erişilemez

  function viewRisk() {
    const bal = state.accounts[0].balance;
    return `<div class="stack"><div class="card s3">
      <p class="sect-h">Lot hesaplayıcı</p>
      <input class="inp" data-riskpct value="${riskPercent}" inputmode="decimal">
      <p>Risk tutarı: ${money((bal * riskPercent) / 100)}</p>
    </div></div>`;
  }

  const icon = `<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>`;
  Core.nav({ path: "/risk", label: "Risk", order: 25, side: icon, bottom: icon });
  Core.route("/risk", { nav: "/risk", view: viewRisk });
  Core.listen("input", e => {
    if (e.target.dataset.riskpct === undefined) return;
    riskPercent = num(e.target.value) || 0;
    Core.refresh();
    return true;
  });
})();
```

2. `index.html`'de `view-more.js`'ten **önce** `<script src="js/view-risk.js"></script>` ekle.
3. `sw.js` → `ASSETS`'e `"./js/view-risk.js"` ekle, `CACHE` sürümünü artır.
4. `tests/run.js` → `FILES` listesine `"view-risk"` ekle, bir test yaz.
5. `npm run check`

`app.js`, diğer ekranlar ve `storage.js` **değişmez**. Menü, yol, tıklama ve `sw.js` kontrolü otomatik çalışır.

## Tarif: bir ekrana kart eklemek

Şimdilik her ekranın HTML'i kendi dosyasındadır; başka ekranın içine kart koymak o ekran dosyasında tek satır ekler
(ör. `view-home.js` içinde `${riskCard()}`) ve kartın fonksiyonu yeni dosyada durur. İleride "slot" (kancalı yerleşim noktaları)
gerekirse `Core.slot("home.top", fn)` şeklinde eklenebilir; bu, ekran dosyalarına bir kez `${Core.slot("home.top")}` yazmayı gerektirir.

## Tarif: yeni veri alanı

- İşlem alanları `calc.js` → `normTrade` içinde normalize edilir; **bilinmeyen alan yedekte kaybolur**, bu yüzden yeni alan oraya da eklenir.
- Formda düzenlenecekse `view-add.js` (`emptyForm`, `fromTrade`, `saveForm`) güncellenir.
- Yeni bir kalıcı ayar için `localStorage` anahtarı `tj_` önekiyle açılır; işlem verisi gibi korunması gereken şey `state` + `storage.js` üzerinden gider.
- Verinin değişimini izleyen özellikler `Core.on("saved:trades", …)` kullanır; `storage.js`'e dokunulmaz.

## Bu çekirdekle henüz çözülmeyenler (sonraki adımlar)

- **Ortak `state`:** ekranlar hâlâ `state.trades` gibi alanları doğrudan okuyup yazar. Sıradaki adım, yazmaların `services.js` işlevlerinden (ör. `addTrade`, `removeTrade`) geçmesi.
- **Tek global kapsam:** dosyalar klasik betik; ES modüllerine geçiş `import` ile bağımlılığı görünür kılar (testlerdeki sahte DOM sandbox'ının uyarlanması gerekir).
- **Slot sistemi** (yukarıda) ve **veri şeması sürümü** (`schema: 2`) yeni alan sayısı arttığında eklenmeli.
