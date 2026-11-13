# Ascentia — İşlem Günlüğü

**Ascentia** sunucusuz (serverless) bir trading journal uygulamasıdır. Veriler yalnızca tarayıcında saklanır; localStorage + IndexedDB çift depolama kullanır. HTML/CSS/JS ile yazılmıştır, derleme adımı yoktur; `index.html`'i açmak yeterlidir. GitHub Pages ile yayınlanabilir.

## Özellikler
- **İşlem kaydı:** sembol, yön, giriş/çıkış, lot, stop, hedef, komisyon, çarpan, kur, hesap, etiket (setup/duygu/hata), plan uyumu, işlem puanı, not, kısmi kapatma (parçalı gruplama), açık pozisyon takibi
- **Analiz:** equity eğrisi (hover ile okuma), düşüş eğrisi, R dağılımı, kapanış saati neti, aylık/hesap/setup/duygu/hata/plan/yön/seans/gün/süre dağılımları, kâr faktörü, kazanma oranı, ort. R, maks. düşüş %, beklenti, seriler
- **Psikoloji:** işlem öncesi kontrol listesi (kayda işlenir), duygu etiketleri, plan uyumu, haftalık değerlendirme notu
- **Takvim:** aylık ısı haritası (gün bazında net P&L)
- **Bulgular:** 10+ kapanmış işlemde otomatik kalıp analizi (en kötü hata/duygu/seans, plan dışı etkisi, puan-korelasyonu, kontrol listesi etkisi, en iyi setup)
- **Prop limitleri:** hesap başına günlük kayıp ve maks. düşüş limiti; doluluk çubukları ve aşım uyarısı
- **Veri:** JSON yedek/indir/paylaş, CSV dışa aktar, Excel/MT5/TradingView CSV içe aktarma (otomatik sütun eşleme), yedek birleştirme, tarayıcı dosya sistemine otomatik kayıt (Chrome/Edge), iki sekme arası senkron
- **Çoklu hesap ve etiket yönetimi**, koyu/açık tema, tamamen mobil uyumlu arayüz (klavye açıkken alt menü gizlenir)

## Çalıştırma
- Herhangi bir statik sunucu yeterli (GitHub Pages, Netlify, Vercel, `python -m http.server`).
- Service worker (çevrimdışı kullanım) yalnızca `https://` veya `localhost`'ta etkindir.

## Geliştirme
Uygulamanın kendisi bağımlılıksızdır; araçlar yalnızca geliştirme içindir (`npm install`).

| Komut | Ne yapar |
|---|---|
| `npm test` | Sahte DOM'lu sandbox'ta regresyon testleri (`tests/run.js`) |
| `npm run test:e2e` | Gerçek Chromium'da 390px mobilde tıklama testleri (`tests/e2e.js`, Playwright) |
| `npm run lint` | ESLint + tüm `js/` dosyalarını birleştirip tanımsız/kullanılmayan ad kontrolü (`tests/lint.js`) |
| `npm run format` | Prettier ile biçimlendirir (`.prettierrc`, `.editorconfig`) |
| `npm run check` | biçim + lint + test (CI'da da çalışır) |

Kod düzeni: `js/` dosyaları tek ortak global kapsamı paylaşır ve `index.html`'deki sırayla yüklenir.
Tıklama olayları `app.js` içinde tablo güdümlüdür (`CLICK_ATTRS` + `ACTIONS`): yeni bir düğme eklemek için
`data-act="<eylem>"` yazıp `ACTIONS`'a bir işlev eklemek yeterlidir.

## Mimari
```
index.html          kabuk (tek sayfa, hash router)
css/style.css       tek dosya tasarım sistemi (token tabanlı)
js/utils.js         sayı/tarih/para biçimlendirme, CSV ayrıştırma
js/calc.js          P&L, risk, R, özet istatistikler, dağılımlar, doğrulama, kısmi kapatma çekirdeği
js/storage.js       localStorage + IndexedDB çift depolama, yedek/geri yükleme, CSV içe aktarma
js/symbols.js       enstrüman çarpanları ve sembol eşleme
js/ui.js            ortak UI bileşenleri
js/view-home.js     Bugün + İşlemler listesi
js/view-add.js      Ekle/Düzenle formu
js/view-insights.js Analiz ekranı
js/view-more.js     Ayarlar, hesap/etiket/veri sayfaları, işlem detayı
js/app.js           router, form akışı, olay handlerları
tests/run.js        Node tabanlı regresyon testleri (sahte DOM)
tests/e2e.js        Gerçek tarayıcı (Playwright) tıklama testleri
tests/lint.js       Birleşik kapsam lint kontrolü
```

## Gizlilik
Veri sunucuya gönderilmez. Analitik, izleme, çerez yok. Yedek dosyaları senin kontrolündedir.


## Mobil odaklı görsel yenileme (v3)
- Koyu evergreen + mineral lime renk sistemi ve açık tema eşlemesi.
- Mobilde yüzen alt navigasyon, daha belirgin günlük P&L kartı ve ana ekranda hızlı işlem/analiz kısayolları.
- İşlem formu, analiz, kartlar ve grafikler için daha tutarlı dokunma alanları, yüzeyler ve tipografik hiyerarşi.
- PWA tema rengi ve service worker önbellek sürümü yenilendi.


## v3.1
- Analiz ekranı sekmelere ayrıldı: Özet, Zaman, Strateji, Davranış; filtreler her zaman görünür.
- Güvenlik: görsel ve id alanları kaçırılıyor, görsel yalnızca image data URL kabul ediyor.
- CSV: negatif sayılar metne dönmüyor. Para birimi açılışta yükleniyor. Service worker stale-while-revalidate.
