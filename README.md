# 🎉 Instagram Çekiliş Sistemi

Kendi Instagram hesabınla giriş yapıp yorumları çeken, filtreleyen ve kazanan seçen tam bir çekiliş sistemi.

## 📁 Proje Yapısı

```
instagram-cekilis/
├── backend/          # Node.js + Express API
│   └── src/
│       ├── services/
│       │   ├── session.js    # Instagram login & cookie yönetimi
│       │   └── scraper.js    # Yorum çekme & filtreleme
│       ├── routes/
│       │   └── instagram.js  # API endpoint'leri
│       └── index.js
└── frontend/         # React arayüz
    └── src/
        ├── components/
        │   ├── LoginForm.jsx
        │   ├── CekilisForm.jsx
        │   └── Results.jsx
        └── App.jsx
```

## 🚀 Kurulum

### Backend
```bash
cd backend
cp .env.example .env
npm install
npm run dev
```

### Frontend
```bash
cd frontend
npm install
npm run dev
```

## 🔗 Kullanım

1. `http://localhost:5173` adresini aç
2. Instagram kullanıcı adı ve şifreni gir
3. Çekiliş yapılacak gönderi linkini yapıştır
4. Katılım koşullarını seç:
   - @ Etiket zorunlu mu?
   - Minimum kaç kişi etiketlenmeli?
   - Mükerrer yorumlar sayılsın mı?
   - Takipçi kontrolü yapılsın mı?
5. Kazanan sayısını seç
6. "Çekilişi Başlat" butonuna bas

## ⚙️ API Endpoint'leri

| Method | Endpoint | Açıklama |
|--------|----------|----------|
| GET | `/api/instagram/session` | Oturum durumu |
| POST | `/api/instagram/login` | Giriş yap |
| POST | `/api/instagram/logout` | Çıkış yap |
| POST | `/api/instagram/cekilis` | Çekilişi başlat |
| POST | `/api/instagram/preview` | Gönderi önizleme |

### Çekiliş isteği örneği:
```json
{
  "postUrl": "https://www.instagram.com/p/ABC123/",
  "requireMention": true,
  "minMentions": 1,
  "allowDuplicates": false,
  "requireFollower": false,
  "winnerCount": 1
}
```

## ⚠️ Önemli Notlar

- Instagram şifresi **hiçbir yerde saklanmaz**, sadece session cookie tutulur
- Çok fazla istek atarsan Instagram seni geçici olarak **engelleyebilir**
- **Rate limiting** zaten kodda var (istekler arası bekleme süresi)
- Takipçi kontrolü açıkken çekiliş **çok yavaş** olabilir (her kullanıcı için ayrı istek)
- Instagram'ın ToS'una aykırı olduğunu unutma, kendi sorumluluğundadır

## 🛠️ İleri Geliştirme Fikirleri

- [ ] Proxy rotasyonu ekle
- [ ] Çoklu hesap desteği
- [ ] Çekiliş geçmişi (veritabanı)
- [ ] Sonuçları PDF olarak indir
- [ ] Canlı yorum sayacı (WebSocket)
- [ ] Çekiliş animasyonu
