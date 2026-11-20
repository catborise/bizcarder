import axios from 'axios';

// Vite environment variable'dan API URL'ini al, yoksa localhost varsay
export const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';

const api = axios.create({
    baseURL: API_URL,
    withCredentials: true, // Cookie'leri (Session ID) gönder
});

const SAFE_METHODS = new Set(['get', 'head', 'options']);

// Read CSRF token from cookie and send it as a header on state-changing requests
api.interceptors.request.use((config) => {
    const method = (config.method || 'get').toLowerCase();
    if (!SAFE_METHODS.has(method)) {
        const match = document.cookie.match(/(?:^|;\s*)csrf-token=([^;]+)/);
        if (match) {
            config.headers['X-CSRF-Token'] = decodeURIComponent(match[1]);
        }
    }
    return config;
});

export default api;
