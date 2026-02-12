import axios from 'axios';

// Vite environment variable'dan API URL'ini al, yoksa localhost varsay
export const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';

const api = axios.create({
    baseURL: API_URL,
    withCredentials: true // Cookie'leri (Session ID) gönder
});

export default api;
