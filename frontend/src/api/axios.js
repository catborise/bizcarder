import axios from 'axios';

// Vite environment variable'dan API URL'ini al, yoksa localhost varsay
const baseURL = import.meta.env.VITE_API_URL || 'http://localhost:5000';

const api = axios.create({
    baseURL,
    withCredentials: true // Cookie'leri (Session ID) gönder
});

export default api;
