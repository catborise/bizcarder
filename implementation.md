# Proje Uygulama Dokümantasyonu (Implementation Documentation)

Bu belge, CRM Business Card uygulamasının mevcut durumunu, mimarisini ve özelliklerini detaylandırmaktadır.

## 1. Proje Özeti
CRM Business Card uygulaması, kullanıcıların kartvizitleri dijital ortamda saklamasını, düzenlemesini, etkileşim kayıtlarını tutmasını ve yönetici kullanıcıların sistemi yönetmesini sağlayan tam kapsamlı bir web uygulamasıdır. Modern Glassmorphism tasarım dili kullanılarak geliştirilmiştir.

## 2. Teknoloji Yığını (Tech Stack)

### Backend
- **Platform:** Node.js
- **Framework:** Express.js
- **Veritabanı:** PostgreSQL (pg)
- **ORM:** Sequelize
- **Kimlik Doğrulama:** Passport.js (Local & SAML), Express Session
- **Dosya Yönetimi:** Multer (resim yüklemeleri için)
- **Güvenlik:** Bcryptjs (şifreleme), CORS

### Frontend
- **Framework:** React (Vite)
- **Tasarım:** Custom CSS (Glassmorphism), Material UI (Icons)
- **İstemci (HTTP):** Axios
- **Yönlendirme:** React Router DOM v6
- **Görüntü İşleme:** Tesseract.js (OCR için)

## 3. Backend Mimarisi ve Özellikleri

### Veritabanı Modelleri
Sistemde aşağıdaki ana modeller bulunmaktadır:
- **User:** Kullanıcı bilgileri, rolleri (admin/user) ve kimlik doğrulama verileri.
- **BusinessCard:** Kartvizit bilgileri (İsim, şirket, iletişim, resim yolları).
- **Interaction:** Kartvizitlerle yapılan görüşme/etkileşim notları.
- **AuditLog:** Sistemdeki önemli işlemlerin kayıtları (loglar).

### API Güvenliği ve Yetkilendirme
- **Authentication:** `/auth` endpoint'leri üzerinden oturum açma işlemleri yönetilir.
- **Middleware:** 
    - `requireAuth`: Oturum açmamış kullanıcıların API erişimini engeller.
    - `requireAdmin`: Sadece 'admin' rolüne sahip kullanıcıların erişimine izin verir (Kullanıcı yönetimi için).

### API Endpoint'leri
- **Kartvizit Yönetimi (`/api/cards`):** Listeleme, ekleme (resim ve OCR ile), düzenleme, silme.
- **Etkileşimler (`/api/interactions`):** Belirli bir kartvizite ait notların eklenmesi.
- **Loglar (`/api/logs`):** Sistem aktivitelerinin izlenmesi.
- **Kullanıcı Yönetimi (`/api/users`):** (Admin Only) Kullanıcıları listeleme ve rol değiştirme.

## 4. Frontend Mimarisi ve Özellikleri

### Tasarım ve Arayüz
- **Glassmorphism:** Uygulama genelinde yarı saydam, bulanık arka planlar ve modern gradyanlar kullanılmıştır.
- **Responsive:** Mobil ve masaüstü uyumlu yapı.
- **Özel Bileşenler:** Modal, Bildirim Banner'ı, Korunmuş Rotalar (ProtectedRoute).

### Sayfalar ve Bileşenler
- **Dashboard (`/`):** Genel durum özeti ve hızlı erişim butonları.
- **Giriş (`/login`):** Kullanıcı girişi.
- **Kartvizitler (`/contacts`):** 
    - Kart listeleme (Grid yapı).
    - Arama ve Filtreleme (İsim, şirket, şehir vb.).
    - Sıralama (Yeni/Eski, İsim vb.).
    - Kart Detayları: Ön/Arka yüz görseli, "Görüşmeler" ve "Notlar" sekmeleri.
- **Kullanıcı Yönetimi (`/users`):** Admin kullanıcıların diğer kullanıcıların rollerini değiştirebildiği panel.
    - *Not: `App.jsx` içinde rota tanımı eksik olabilir, kontrol edilmeli.*
- **Loglar (`/logs`):** Sistemdeki değişikliklerin tarihçesi.

### Özellikler
1. **Kartvizit OCR:** Tesseract.js entegrasyonu ile yüklenen resimlerden metin ayrıştırma (Backend/Frontend entegrasyonu).
2. **Resim Yönetimi:** Ön ve arka yüz fotoğraflarının yüklenmesi ve görüntülenmesi.
3. **Rol Bazlı Erişim:** Admin kullanıcılar ekstra menüleri görür ve yetkilendirme yapabilir.

## 5. Mevcut Durum ve Notlar
- Backend tam fonksiyonel görünüyor (Auth, CRUD, DB Sync).
- Frontend ana akışları tamamlanmış (Kart ekleme, listeleme, detay görüntüleme).
- **Tespit Edilen Eksiklik:** `App.jsx` dosyasında `UserManagement` bileşeni import edilmiş ve Link verilmiş ancak `<Route path="/users" ... />` tanımı eksik görünüyor. Bu sayfaya erişimde sorun yaşanabilir.

## 6. Kurulum ve Çalıştırma
- **Backend:** `cd backend` -> `npm install` -> `npm start` (Port 5000)
- **Frontend:** `cd frontend` -> `npm install` -> `npm run dev` (Vite Server)
- **Veritabanı:** PostgreSQL bağlantı ayarlarının `.env` veya config dosyasında yapılması gerekir.
