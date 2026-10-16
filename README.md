# Ascentia — İşlem Günlüğü

Tarayıcıda çalışan, sunucusuz işlem günlüğü. Veriler yalnızca kullanıcının cihazında kalır.

## Yapı

```
index.html          sayfa iskeleti
css/style.css       tüm stiller
js/utils.js         yardımcı fonksiyonlar
js/calc.js          P&L, R, özet, doğrulama
js/storage.js       localStorage, IndexedDB, dosya kaydı, state
js/symbols.js       sembol listesi ve arama
js/ui.js            ortak arayüz parçaları (kart, toast, kpi)
js/view-home.js     Özet ve İşlemler sayfaları
js/view-add.js      İşlem ekleme formu
js/view-insights.js Analiz sayfası
js/view-more.js     Daha, ayarlar, işlem detayı
js/app.js           router, form kaydı, CSV/JSON, olaylar, başlatma
```

Script sırası önemlidir (index.html içinde yazıldığı sırayla yüklenir).

## Yerelde çalıştırma

`python3 -m http.server` ile klasörü aç, sonra http://localhost:8000

## GitHub Pages

Repo → Settings → Pages → Branch: main, folder: / (root).

## Test

Bağımlılık gerektirmez (Node 18+):

```
node tests/run.js
```

Gerçek `js/` dosyalarını sahte bir tarayıcı ortamına yükler; P&L/R/drawdown, stop doğrulama, sayı ayrıştırma, CSV/JSON içe aktarma, depolama (localStorage/IndexedDB çakışmaları), kısmi kapatma istatistikleri ve tüm ekranların çizimini kontrol eder.
