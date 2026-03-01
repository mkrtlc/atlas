import axios from 'axios';
import { config } from '../config/env';

export const adminApi = axios.create({
  baseURL: config.apiUrl,
  headers: { 'Content-Type': 'application/json' },
});

adminApi.interceptors.request.use((req) => {
  const token = localStorage.getItem('atlas_admin_token');
  if (token) {
    req.headers.Authorization = `Bearer ${token}`;
  }
  return req;
});

adminApi.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('atlas_admin_token');
      localStorage.removeItem('atlas_admin_username');
      if (window.location.pathname.startsWith('/admin') && window.location.pathname !== '/admin/login') {
        window.location.href = '/admin/login';
      }
    }
    return Promise.reject(error);
  },
);
