import axios from 'axios';

// Vite environment variable'dan API URL'ini al, yoksa localhost varsay
export const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';

const api = axios.create({
    baseURL: API_URL,
    withCredentials: true // Cookie'leri (Session ID) gönder
});

// Read CSRF token from cookie and send it as a header on every state-changing request
api.interceptors.request.use((config) => {
    const match = document.cookie.match(/csrf-token=([^;]+)/);
    if (match) {
        config.headers['X-CSRF-Token'] = match[1];
    }
    return config;
});

export default api;
