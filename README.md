# Bizcarder - CRM Business Card Management System

Bizcarder is a modern CRM application designed for managing business cards. It features OCR-powered data extraction, secure authentication, and robust export capabilities — all wrapped in a Bold Premium design with gradient accents and full mobile responsiveness.

## Features

-   **OCR Integration**: Automatically extract information from business card images using Tesseract.js.
-   **Secure Authentication**: Session-based authentication with Passport.js, SAML/Shibboleth SSO support.
-   **Dashboard**: Statistics overview with gradient stat cards, quick actions, and frequent tags.
-   **Bold Premium UI**: Gradient color system, color-coded CRM cards, accent-based visual hierarchy, and dark/light theme support.
-   **Mobile-First Design**: Bottom navigation, floating action button, full-screen modals, responsive grids, and touch-optimized controls.
-   **Multilingual**: Full Turkish and English language support with real-time switching (i18next).
-   **Digital Business Card**: Personal vCard with QR code sharing and public profile link.
-   **Export Capabilities**: Export business cards to XLSX or PDF formats.
-   **CRM Features**: Lead status tracking, priority levels, tags, interaction logging, reminders, and follow-ups.
-   **Admin Panel**: User management with role/approval toggles, activity logs, and system settings.
-   **PWA Support**: Installable as a mobile app with offline capabilities via Service Worker and IndexedDB.
-   **Trash Management**: Soft delete with configurable retention and restore functionality.

## Authentication

The system supports two methods of authentication:
1. **Local Authentication**: Standard username and password login with registration and admin approval workflow.
2. **SAML 2.0 (Shibboleth)**: Enterprise SSO integration.

For details on how to configure SAML for your organization, please refer to the [SAML / Shibboleth Configuration Guide](SAML_GUIDE.md).

## Technology Stack

### Backend
-   **Runtime**: Node.js
-   **Framework**: Express.js
-   **Database**: PostgreSQL
-   **ORM**: Sequelize
-   **Authentication**: Passport.js (Local & Session), SAML 2.0
-   **File Storage**: Local filesystem via Multer

### Frontend
-   **Framework**: React 18 (Vite)
-   **UI Library**: Material UI (MUI) v7, React Icons
-   **Styling**: CSS custom properties (design tokens), gradient color system, responsive breakpoints
-   **Animations**: Framer Motion (page transitions, staggered lists, micro-interactions)
-   **OCR**: Tesseract.js
-   **i18n**: i18next with namespace-based translations (TR/EN)
-   **State Management**: React Context API (Auth, Theme, Notification)
-   **HTTP Client**: Axios
-   **Offline**: Dexie (IndexedDB), Service Worker
-   **QR**: qrcode.react

## Installation & Setup

### Using Docker (Recommended)

1.  Clone the repository:
    ```bash
    git clone https://github.com/catborise/bizcarder.git
    cd bizcarder
    ```
2.  Start the services:
    ```bash
    docker-compose up --build
    ```
3.  Access the applications:
    -   Frontend: [http://localhost:5173](http://localhost:5173)
    -   Backend API: [http://localhost:5000](http://localhost:5000)

### Default Credentials

After setting up the application, you can log in with the following default administrative account:
- **Username**: `admin`
- **Password**: `admin`

> **Important:** Please change your password immediately after your first login for security reasons.

### Manual Setup

#### 1. Backend
```bash
cd backend
npm install
# Configure .env (refer to docker-compose.yml for required keys)
npm run dev
```

#### 2. Frontend
```bash
cd frontend
npm install
npm run dev
```

## Usage

1.  **Register/Login**: Create an account or use SSO.
2.  **Add Card**: Use the "Add Card" button or the mobile FAB (+) to upload a business card image.
3.  **OCR Processing**: Crop the card image, and OCR will auto-fill contact details.
4.  **Manage**: View, edit, filter, and tag cards. Track lead status, priority, and interactions.
5.  **Share**: Create your digital business card and share via QR code or link.
6.  **Export**: Download your contacts as Excel, PDF, or vCard.

## License

Distributed under the MIT License. See `LICENSE` for more information.
