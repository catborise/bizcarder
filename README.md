# Bizcarder - CRM Business Card Management System

Bizcarder is a modern CRM application designed for managing business cards. It features OCR-powered data extraction, secure authentication, and robust export capabilities.

## 🚀 Features

-   **OCR Integration**: Automatically extract information from business card images using Tesseract.js.
-   **Secure Authentication**: Session-based authentication with Passport.js.
-   **Dashboard**: Overview of business card statistics and recent activities.
-   **Premium UI**: Sleek, glassmorphism-inspired design with Material UI and custom CSS.
-   **Export Capabilities**: Export your business cards to XLSX or PDF formats.
-   **Interactions**: Log meetings and interactions related to each business card.
-   **Admin Panel**: Manage users and system settings (log retention, trash cleanup).
-   **Mobile Friendly**: Responsive design for use on various devices.

## 🛠️ Technology Stack

### Backend
-   **Runtime**: Node.js
-   **Framework**: Express.js
-   **Database**: PostgreSQL
-   **ORM**: Sequelize
-   **Authentication**: Passport.js (Local & Session)
-   **File Storage**: Local filesystem via Multer

### Frontend
-   **Framework**: React (Vite)
-   **UI Library**: Material UI (MUI) & React Icons
-   **OCR**: Tesseract.js
-   **State Management**: Context API
-   **HTTP Client**: Axios

## 📦 Installation & Setup

### Using Docker (Recommended)

The easiest way to get started is by using Docker Compose:

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

### 🔐 Default Credentials

After setting up the application, you can log in with the following default administrative account:
- **Username**: `admin`
- **Password**: `admin`

> [!IMPORTANT]
> Please change your password immediately after your first login for security reasons.

### Manual Setup

#### 1. Backend
1.  Navigate to the `backend` directory:
    ```bash
    cd backend
    ```
2.  Install dependencies:
    ```bash
    npm install
    ```
3.  Configure environment variables in a `.env` file (refer to `docker-compose.yml` for required keys).
4.  Start the server:
    ```bash
    npm run dev
    ```

#### 2. Frontend
1.  Navigate to the `frontend` directory:
    ```bash
    cd frontend
    ```
2.  Install dependencies:
    ```bash
    npm install
    ```
3.  Start the development server:
    ```bash
    npm run dev
    ```

## 📖 Usage

1.  **Register/Login**: Start by creating an account.
2.  **Add Card**: Click on "Yeni Kart Ekle" to upload a business card image.
3.  **OCR Processing**: Use the crop tool to select the card, and the system will attempt to fill in the details automatically.
4.  **Manage**: View, edit, or delete cards from your dashboard.
5.  **Export**: Use the export buttons on the cards list page to download your data.

## ⚖️ License

Distributed under the MIT License. See `LICENSE` (if applicable) for more information.
