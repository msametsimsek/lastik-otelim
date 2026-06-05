# LastikOtelim

LastikOtelim, lastik işletmeleri için geliştirilen müşteri, araç, lastik emaneti, depo konumu, etiket yazdırma ve işletme yönetimi odaklı modern bir takip sistemidir.

Bu proje, lastikçilerde manuel defter veya dağınık kayıt kullanımını azaltmak; müşteri, plaka ve lastik emanet süreçlerini dijitalleştirmek amacıyla geliştirilmiştir.

---

## Proje Durumu

Frontend tarafı aktif olarak geliştirilmektedir. Authentication ve işletme ayarları entegrasyonları gerçek API ile çalışır hale getirilmiştir.

Tamamlanan ana entegrasyonlar:

- Register API entegrasyonu
- Login API entegrasyonu
- Sayfa yenilenince oturum kontrolü
- Access token expiration kontrolü
- RefreshToken entegrasyonu
- Aynı anda çoklu refresh isteğini engelleyen refresh kilidi
- RevokeToken / Logout entegrasyonu
- Business GetById entegrasyonu
- Business Update entegrasyonu
- Ayarlar sayfasının API ile senkron çalışması

---

## Temel Özellikler

- Müşteri kaydı oluşturma
- Müşteriye bağlı araç / plaka yönetimi
- Lastik emaneti oluşturma
- Lastik türü, marka, ebat, adet ve depo konumu takibi
- Lastik kaydına özel LastikCode oluşturma
- Etiket yazdırma
- Teslim edilen / silinen kayıtların takibi
- İşletme bilgilerini API üzerinden görüntüleme ve güncelleme
- Oturum yönetimi ve güvenli çıkış

---

## Teknolojiler

- React
- TypeScript
- Vite
- Tailwind CSS
- Lucide React
- REST API entegrasyonu
- LocalStorage fallback / geçiş yapısı

---

## API Yapısı

Frontend API adresi `.env` dosyası üzerinden yönetilir.

```env
VITE_API_BASE_URL=https://gateway.teggsoft.com/tire
```

Aktif kullanılan endpointler:

```txt
POST /Auth/Register
POST /Auth/Login
GET  /Auth/Detail
GET  /Auth/RefreshToken
PUT  /Auth/RevokeToken

GET  /Business/GetById
PUT  /Business/Update
```

---

## Kurulum

Projeyi yerelde çalıştırmak için:

```bash
cd frontend
npm install
npm run dev
```

Varsayılan geliştirme adresi:

```txt
http://localhost:3000
```

---

## Ortam Değişkenleri

`frontend/.env` dosyası içinde şu değer bulunmalıdır:

```env
VITE_API_BASE_URL=https://gateway.teggsoft.com/tire
```

Güvenlik nedeniyle `.env` dosyaları repoya gönderilmemelidir.

---

## Proje Klasör Yapısı

```txt
lastik-otelim/
├── frontend/
│   ├── src/
│   │   ├── components/
│   │   ├── pages/
│   │   ├── services/
│   │   ├── types.ts
│   │   └── App.tsx
│   ├── package.json
│   └── vite.config.ts
├── README.md
└── .gitignore
```

---

## Geliştirme Yol Haritası

Sıradaki planlanan entegrasyonlar:

- Customer API entegrasyonu
- Vehicle / Plate API entegrasyonu
- Tire Record API entegrasyonu
- Depo / raf konumu API entegrasyonu
- Fotoğraf yükleme entegrasyonu
- Abonelik ve ödeme süreçlerinin tamamlanması
- Super Admin / işletme yönetimi yapısı

---

## Geliştirici Notu

Bu proje TeggSoft ekosistemi içerisinde geliştirilen SaaS tabanlı işletme yönetim projelerinden biridir. Amaç, lastik işletmelerinin günlük operasyonlarını sade, hızlı ve güvenilir bir panel üzerinden yönetebilmesini sağlamaktır.

---

## Geliştirici

**Samet Şimşek**
TeggSoft Creative Agency
