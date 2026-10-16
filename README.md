# Ascentia — İşlem Günlüğü

Tarayıcıda çalışan, sunucusuz işlem (trading) günlüğü. Veriler yalnızca cihazda saklanır
(localStorage + IndexedDB çift depolama). GitHub Pages üzerinde yayınlanır.

## Çalıştırma
- Site: `index.html`'i herhangi bir statik sunucuda/bar tarayıcıda aç.
- Testler: `node tests/run.js` (Node 18+, bağımlılıksız — sahte DOM sandbox'ında 50 test).

## Özellikler
- İşlem ekleme/düzenleme: yön, giriş/çıkış, stop, hedef, lot, komisyon, kur, kontrat çarpanı
- Otomatik risk, R-multiple, risk %, ödül/risk hesabı (canlı önizleme)
- Kısmi kapatma (detay sayfasından miktar girerek), stop'u oynatılmış işlemlerde ilk stop ile R
- Özet, işlem listesi (arama/filtre) ve analiz ekranı: equity eğrisi, düşüş eğrisi,
  R dağılımı, kapanış saatine göre net, takvim ısı haritası, aylık/hesap/setup/duygu dağılımları
- Hesaplar: bakiye, para birimi, günlük kayıp ve maks. düşüş limitleri (Analiz'de izlenir)
- Çoklu hesap, plan/uyum takibi, işlem puanı, kontrol listesi, haftalık değerlendirme
- Yedekleme: JSON paylaşım/indirme, geri yükleme, birleştirme, CSV içe/dışa aktarım
  (Excel/MT5/TradingView sütunları otomatik eşleşir), isteğe bağlı otomatik dosya kaydı
  (File System Access API)

## Bu sürümde yapılan düzeltmeler (16 adet)
1. Enter tuşu: iki `keydown` handler çakışıyordu; tek handler — sonraki alana geçer, son alanda kaydeder.
2. JSON geri yükleme/birleştirme hesap limitlerini (`dl`/`md`/`cur`) artık korur.
3. Kısmi kapatma tek çekirdekten (`applyPartial`); hatalı miktar doğrulama mesajıyla reddedilir.
4. Yarım kalan düzenlemeler taslaktan (`__editId`) geri yüklenir.
5. Tarih normalize çoklu boşluk/TR/ISO/noktalı biçimleri kabul eder (`toStamp`).
6. Negatif stop/tp reddedilir (sahte risk/R üretemez).
7. Binlik ayracı bilinmeyen sembolde de tutarlı (`fixThou`).
8. Hesap alanları 400 ms debounce ile kaydedilir.
9. Sekmeler arası senkron etiketleri de kapsar.
10. "Belirsiz" seans bulgulara karışmaz.
11. Ölü kod temizliği (`countUp`, `addMin`, `showBackup`, `allSum`, ölü `csvexport` koşulu, fazladan `</span>`).
12. Çıkışı olmayan işlemde plan etiketi kaydedilmez.
13. `accountId` boş hesap listesinde güvenli.
14. Kur uyarısı yalnızca aktarımda eklenen işlemler için sayılır.
15. Saat dağılımı kapanış zamanına göre hesaplanır.
16. `fld()` boş formda güvenli; depolama/CSV yardımcıları test edilebilir modüllere taşındı.

Kanıt: `node tests/run.js` → 50/50. Düzeltme öncesi kodda aynı paket 36/50 verir;
kırmızı olan 14 test tamamen bu düzeltmelere karşılık gelen regresyon testleridir.

## Mimari
Saf HTML/CSS/JS, bağımlılıksız. `js/` modülleri `index.html`'deki sırayla yüklenir:
`utils` (yardımcılar, CSV, `toStamp`) → `calc` (hesap çekirdeği, doğrulama, `applyPartial`)
→ `storage` (çift depo, yedek, içe aktarma) → `symbols` (sembol önerileri) → `ui` (bileşenler)
→ `view-*` (ekranlar) → `app` (yönlendirme + olaylar).

## Lisans / not
Kişisel kullanım için; veriler cihazdan çıkmaz. Yatırım tavsiyesi değildir.
