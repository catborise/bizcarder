# Üretim Ortamı ve SAML Yapılandırma Kılavuzu

Bu belge, uygulamanın üretim ortamında (Production) docker-compose ile nasıl kurulacağını ve SAML 2.0 (Shibboleth) entegrasyonunun detaylarını içerir.

## 1. Merkezi Yapılandırma (.env Dosyası)

Uygulama tüm ayarlarını proje kök dizininde bulunan `.env` dosyasından okur. Üretim ortamında bu dosyayı güvenli bir şekilde oluşturmanız gerekmektedir.

### Örnek .env İçeriği
```bash
# --- DATABASE ---
POSTGRES_USER=crm_user
POSTGRES_PASSWORD=guclu_bir_sifre
POSTGRES_DB=crm_db
DB_HOST=db

# --- BACKEND ---
PORT=5000
SESSION_SECRET=rastgele_uzun_bir_dizi
SESSION_SECURE=true
FRONTEND_URL=https://kartvizit.ulakbim.gov.tr

# --- CORS ---
# Frontend URL ve SAML IdP otomatik eklenir, ek adresler için virgülle ayırın
ALLOWED_ORIGINS=https://kartvizit.ulakbim.gov.tr

# --- SAML (SHIBBOLETH) ---
SAML_ENTRY_POINT=https://kimlik.kurum.gov.tr/idp/profile/SAML2/Redirect/SSO
SAML_ISSUER=https://kartvizit.ulakbim.gov.tr
SAML_CALLBACK_URL=https://kartvizit.ulakbim.gov.tr/auth/login/callback
SAML_CERT="MIID....CERT_ICERIGI...."

# --- FILTRELEME (OPSIYONEL) ---
# Sadece belirli organizasyon birimlerine izin vermek için (Virgül ile ayırın)
# eduPersonPrimaryOrgUnitDN (urn:oid:1.3.6.1.4.1.5923.1.1.1.8) kullanılır
SAML_ALLOWED_ORG_UNITS="ou=birim1,dc=kurum,dc=gov,dc=tr, ou=birim2"

# --- FRONTEND ---
VITE_API_URL=https://kartvizit.ulakbim.gov.tr
```

---

## 2. SAML Metadata Erişimi

Uygulamanın Service Provider (SP) metadata dosyasına şu adresten erişilebilir:
**`https://kartvizit.ulakbim.gov.tr/auth/metadata.xml`**

IdP yöneticiniz bu dosyayı kullanarak uygulamayı sisteme tanımlayabilir. Eğer dosyaya tarayıcıdan erişemiyorsanız, Ters Vekil Sunucu (Caddy/Nginx) yapılandırmanızın `/auth/*` isteklerini backend servisine yönlendirdiğinden emin olun.

---

## 3. IdP (Identity Provider) Yapılandırması

Kurumsal IdP yöneticinize aşağıdaki bilgileri iletmeniz gerekmektedir:

- **Entity ID (Issuer):** `SAML_ISSUER` değişkeninde belirlediğiniz değer.
- **Assertion Consumer Service (ACS) URL:** `SAML_CALLBACK_URL` değeri.
- **Desteklenen Öznitelikler (Attributes):**
    - **Kimlik (ID):** `uid`, `eduPersonPrincipalName` veya `nameID`
    - **E-Posta:** `mail` veya `email`
    - **Görünen İsim:** `displayName` (OID: `2.16.840.1.113730.3.1.241` dahil) veya `cn`

---

## 4. Üretim Dağıtımı (docker-compose.yml)

Üretim ortamında stabilite ve performans için **dosya bağlama (host volume mount)** kullanılmaması önerilir. Bu, "EIO: i/o error" gibi senkronizasyon hatalarını önler.

### docker-compose.prod.yml (Önerilen)
```yaml
version: '3.8'

services:
  db:
    image: postgres:15-alpine
    restart: always
    env_file: .env
    volumes:
      - pgdata:/var/lib/postgresql/data
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U $${POSTGRES_USER} -d $${POSTGRES_DB}"]
      interval: 10s
      timeout: 5s
      retries: 5

  backend:
    build: ./backend
    restart: always
    env_file: .env
    environment:
      - DB_HOST=db
    depends_on:
      db:
        condition: service_healthy
    volumes:
      - crm_uploads:/app/uploads # Sadece yüklenen dosyalar için volume kullanılır

  frontend:
    build: ./frontend
    restart: always
    env_file: .env
    depends_on:
      - backend

  caddy:
    image: caddy:latest
    restart: always
    ports:
      - "80:80"
      - "443:443"
    volumes:
      - ./Caddyfile:/etc/caddy/Caddyfile
      - caddy_data:/data
      - caddy_config:/config

volumes:
  pgdata:
  crm_uploads:
  caddy_data:
  caddy_config:
```

### Kurulum Komutları
```bash
# 1. Kodu sunucuya çekin
git pull origin main

# 2. .env dosyasını düzenleyin
nano .env

# 3. Uygulamayı ayağa kaldırın
docker-compose -f docker-compose.prod.yml up --build -d
```

---

## 5. Önemli Notlar ve İpuçları

1.  **Güvenli Oturumlar**: Üretim ortamında `SESSION_SECURE=true` olmalıdır. Bu ayar, çerezlerin sadece HTTPS üzerinden gönderilmesini sağlar. Uygulama otomatik olarak `trust proxy` ayarını kullandığı için Caddy/Nginx arkasında sorunsuz çalışır.
2.  **Kullanıcı Onayı**: SSO/SAML ile ilk kez giriş yapan kullanıcılar sistemde otomatik olarak oluşturulur ve `isApproved: true` (Onaylı) olarak işaretlenir.
3.  **Hata Ayıklama**: SAML ile ilgili bir sorun yaşarsanız, backend konteyner loglarını inceleyebilirsiniz:
    `docker logs -f crm_backend`
4.  **Backend Erişimi**: Backend API'niz ve metadata dosyanız proxy üzerinde `/auth` ve `/api` prefiksleri ile dış dünyaya açık olmalıdır.
