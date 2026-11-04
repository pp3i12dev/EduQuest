import axios from 'axios';

// Producción: configurar VITE_API_URL=https://api.tu-dominio.com/api en frontend.
const api = axios.create({ baseURL: (import.meta.env.VITE_API_URL || 'http://localhost:3000/api').replace(/\/$/, '') });
api.interceptors.request.use(config => {
  const token = localStorage.getItem('token');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
}, error => Promise.reject(error));
export default api;
