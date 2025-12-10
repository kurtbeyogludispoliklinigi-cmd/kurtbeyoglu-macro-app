
# 🦷 Kurtbeyoğlu Diş Kliniği - Yönetim Sistemi

**Version 2.0.0** - Modern diş kliniği yönetim yazılımı

Özellikler:
- ✅ Hasta takibi ve kayıt yönetimi
- ✅ Tedavi fiyat kataloğu ve otomatik indirim hesaplama
- ✅ Akıllı hekim atama sistemi (Queue-based)
- ✅ Randevu yönetimi
- ✅ Dashboard ve raporlama
- ✅ **Uygulama içi yardım sistemi** (Yeni! 🎉)
- ✅ Şifre yönetimi ve güvenlik logları

## 🚀 Hızlı Başlangıç

```bash
# Kurulum
npm install

# Geliştirme Modu
npm run dev
```

Tarayıcınızda `http://localhost:3000` adresine gidin.

## 📚 Dokümantasyon

**Son Kullanıcılar İçin:**
- Uygulama içinde sağ alttaki **"?" (Yardım)** butonuna tıklayın.
- Yardım merkezi; giriş yapma, hasta ekleme ve ödeme alma gibi tüm süreçleri görsel olarak anlatır.

**Geliştiriciler İçin:**
- Teknik dokümantasyon: `CLAUDE.md`
- Veritabanı kurulumu: `migrations/initial_setup.sql`

## 🗂️ Proje Yapısı

- **`/src/app`**: Next.js App Router sayfaları.
- **`/src/components`**: Yeniden kullanılabilir UI bileşenleri (`HelpModal`, `TreatmentForm` vb.).
- **`/src/hooks`**: Custom React hooks (`useTreatmentCatalog`, `useAppointments`).
- **`/src/lib`**: Yardımcı kütüphaneler (Supabase client).

## 🔧 Kurulum Gereksinimleri

1. Node.js 18+
2. Supabase projesi
3. `.env.local` dosyası (Supabase URL ve Key ile)

## 📞 Destek

Sorun yaşıyorsanız:
1. Uygulama içi "Yardım" bölümünü kontrol edin.
2. `CLAUDE.md` dosyasındaki "Sorun Giderme" başlığına bakın.
