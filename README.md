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

## Bu sürümde eklenenler (FIX 17–20)
17. **FIX:** kontrol listesi snapshot'ı `saveForm`'da çökme ("1111" → JSON.parse sayı → `.filter` TypeError); liste artık ham string okunuyor.
18. **PWA:** manifest.json + service worker + ikonlar; ana ekrana yüklenebilir, çevrimdışı açılır ("Daha" ekranında yükleme düğmesi).
19. **Anı değerlendirme:** son 72 saatte kapanan işlemler için Bugün ekranında hızlı duygu+not kartı.
20. **İşlem görseli:** ekleme/düzenlemede chart ekran görüntüsü (canvas ile sıkıştırılır, işlem kaydında dataURL olarak saklanır, JSON yedeğe dahil).

## Test
`node tests/run.js` — bağımlılıksız sandbox'da 55 regresyon testi.

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
```

## Gizlilik
Veri sunucuya gönderilmez. Analitik, izleme, çerez yok. Yedek dosyaları senin kontrolündedir.


## Mobil odaklı görsel yenileme (v3)
- Koyu evergreen + mineral lime renk sistemi ve açık tema eşlemesi.
- Mobilde yüzen alt navigasyon, daha belirgin günlük P&L kartı ve ana ekranda hızlı işlem/analiz kısayolları.
- İşlem formu, analiz, kartlar ve grafikler için daha tutarlı dokunma alanları, yüzeyler ve tipografik hiyerarşi.
- PWA tema rengi ve service worker önbellek sürümü yenilendi.
