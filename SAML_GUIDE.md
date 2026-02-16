# SAML / Shibboleth Yapılandırma Kılavuzu

Bu uygulama SAML 2.0 (Shibboleth) protokolünü desteklemektedir. Aktifleştirmek için aşağıdaki adımları takip edin.

## 1. Environment Değişkenleri

Backend servisiniz için aşağıdaki ortam değişkenlerini (`.env` veya `docker-compose.yml`) ayarlamanız gerekmektedir:

| Değişken | Açıklama | Örnek Değer |
| :--- | :--- | :--- |
| `SAML_ENTRY_POINT` | IdP'nin Single Sign-On (SSO) URL'si | `https://idp.kurum.edu.tr/idp/profile/SAML2/Redirect/SSO` |
| `SAML_ISSUER` | Uygulamanızın IdP tarafındaki benzersiz adı (Entity ID) | `bizcarder-app` |
| `SAML_CALLBACK_URL` | IdP'nin başarılı girişten sonra döneceği tam URL (ACS) | `https://crm.kurum.edu.tr/auth/login/callback` |
| `SAML_CERT` | IdP'nin sağladığı kamu sertifikası (Public Key) | `MIID.... (Sertifika içeriği)` |
| `FRONTEND_URL` | Kullanıcı giriş yaptıktan sonra yönlendirilecek ana sayfa | `https://crm.kurum.edu.tr` |
| `SESSION_SECURE` | Eğer HTTPS kullanıyorsanız mutlaka `true` yapın | `true` |

## 2. IdP (Identity Provider) Yapılandırması

Kurumsal IdP yöneticinize aşağıdaki bilgileri iletmeniz gerekebilir:

- **Entity ID (Issuer):** `SAML_ISSUER` değişkeninde belirlediğiniz değer.
- **Assertion Consumer Service (ACS) URL:** `SAML_CALLBACK_URL` değişkeninde belirlediğiniz değer (Backend rotası).
- **Identifier Format:** `urn:oasis:names:tc:SAML:1.1:nameid-format:unspecified` (veya IdP varsayılanı).

## 3. Öznitelik Eşleştirme (Attribute Mapping)

Uygulama, gelen SAML paketinde şu öznitelikleri (OID veya isim bazlı) otomatik olarak tanır:

- **Kullanıcı ID (Zorunlu):** `uid`, `eduPersonPrincipalName` veya `nameID`
- **E-Posta:** `mail` veya `email`
- **Görünen İsim:** `cn`, `displayName`

## 4. Test Etme

1. Ayarları yaptıktan sonra backend'i yeniden başlatın.
2. Giriş sayfasında "Shibboleth" sekmesine geçin.
3. "Shibboleth ile Giriş Yap" butonuna basın.
4. IdP sayfasına yönlendirileceksiniz. Giriş yaptıktan sonra sistem sizi uygulamaya geri döndürecektir.

## 5. Üretim Dağıtımı (Production Deployment)

Üretim ortamında (HTTPS ve SAML aktif) uygulamayı çalıştırmak için aşağıdaki `docker-compose.prod.yml` şablonunu kullanabilirsiniz. Bu dosyayı sunucunuzda manuel olarak oluşturun:

```yaml
version: '3.8'

services:
  db:
    image: postgres:15-alpine
    restart: always
    environment:
      POSTGRES_USER: ${DB_USER}
      POSTGRES_PASSWORD: ${DB_PASSWORD}
      POSTGRES_DB: ${DB_NAME}
    volumes:
      - pgdata:/var/lib/postgresql/data

  backend:
    build: ./backend
    restart: always
    env_file:
      - .env
    environment:
      - DB_HOST=db
      - DB_USER=${DB_USER}
      - DB_PASSWORD=${DB_PASSWORD}
      - DB_NAME=${DB_NAME}
      - SESSION_SECRET=${SESSION_SECRET}
      - ALLOWED_ORIGINS=https://alanadiniz.com # Sizin üretim alan adınız
    depends_on:
      - db
    volumes:
      - crm_uploads:/app/uploads

  frontend:
    build:
      context: ./frontend
    restart: always
    env_file:
      - .env
    environment:
      - VITE_API_URL=https://alanadiniz.com # Sizin üretim alan adınız
      - NODE_OPTIONS=--max-old-space-size=4096
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
    depends_on:
      - frontend
      - backend

volumes:
  pgdata:
  crm_uploads:
  caddy_data:
  caddy_config:
```

### Başlatma Komutu
Dosyayı oluşturduktan sonra şu komutla başlatın:
```bash
docker-compose -f docker-compose.prod.yml up --build -d
```

> **Not:** SSO ile gelen kullanıcılar `isApproved: true` olarak oluşturulur, yani yönetici onayına gerek kalmadan sistemi kullanmaya başlayabilirler.
