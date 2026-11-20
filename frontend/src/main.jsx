import React from 'react';
import ReactDOM from 'react-dom/client';
import './i18n';
import App from './App.jsx';
import './index.css';

ReactDOM.createRoot(document.getElementById('root')).render(
    <React.StrictMode>
        <App />
    </React.StrictMode>,
);

// Service Worker Registration (production builds only — avoids caching Vite dev modules)
if (import.meta.env.PROD && 'serviceWorker' in navigator) {
    window.addEventListener('load', () => {
        navigator.serviceWorker
            .register('/sw.js')
            .then(() => {
                // Success
            })
            .catch(() => {
                // Error
            });
    });
}
