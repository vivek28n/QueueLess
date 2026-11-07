import axios from 'axios';

/**
 * Resolves the API base URL cleanly across development and production environments.
 * - In local development: defaults to '/api' (proxied by Vite)
 * - In production: uses VITE_API_URL, automatically normalizing trailing slashes and ensuring '/api' path.
 */
const resolveApiBaseUrl = () => {
  const configured = import.meta.env.VITE_API_URL;
  if (!configured) {
    return '/api';
  }

  const trimmed = configured.trim().replace(/\/+$/, '');
  // If the user already supplied a URL ending in /api, use it as-is
  if (trimmed.endsWith('/api')) {
    return trimmed;
  }
  // If the user supplied the backend root URL (e.g. https://api.render.com), append /api
  return `${trimmed}/api`;
};

const api = axios.create({
  baseURL: resolveApiBaseUrl(),
  headers: {
    'Content-Type': 'application/json',
  },
  timeout: 10000,
});

// Request interceptor to attach JWT token if present in localStorage
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('queueless_token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Response interceptor for consistent error handling
api.interceptors.response.use(
  (response) => response,
  (error) => {
    const message =
      error.response?.data?.message ||
      error.message ||
      'An unexpected network error occurred';
    return Promise.reject(new Error(message));
  }
);

export default api;
