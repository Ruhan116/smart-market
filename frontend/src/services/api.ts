import axios, { AxiosInstance } from 'axios';

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:8000/api';

const api: AxiosInstance = axios.create({
  baseURL: API_BASE,
  headers: { 'Content-Type': 'application/json' },
});

// Add JWT to requests
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('access_token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }

  // Normalise relative URLs so we don't accidentally drop the /api prefix from the base URL
  if (typeof config.url === 'string') {
    const urlLower = config.url.toLowerCase();
    const isAbsolute = urlLower.startsWith('http://') || urlLower.startsWith('https://');
    if (!isAbsolute && config.url.startsWith('/')) {
      config.url = config.url.slice(1);
    }
    if (!isAbsolute && import.meta.env.DEV) {
      // Helpful console trace so we can confirm requests fire with the expected URL during debugging
      console.debug('[api] request', `${config.baseURL?.replace(/\/$/, '')}/${config.url}`);
    }
  }

  // For FormData, don't set Content-Type - let browser handle it with proper boundary
  if (config.data instanceof FormData) {
    delete config.headers['Content-Type'];
  }
  return config;
});

// Auto-refresh on 401 (but not for auth endpoints to prevent infinite loops)
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;

    // Don't auto-refresh on auth endpoints - let them return errors directly
    const isAuthEndpoint =
      originalRequest.url?.includes('/auth/login/') ||
      originalRequest.url?.includes('/auth/register/') ||
      originalRequest.url?.includes('/auth/token/refresh/');

    if (error.response?.status === 401 && !isAuthEndpoint) {
      const refreshToken = localStorage.getItem('refresh_token');

      // Prevent infinite retry loops - add a flag to track if we already tried to refresh
      if (refreshToken && !originalRequest._retry) {
        originalRequest._retry = true;
        try {
          const { data } = await axios.post(`${API_BASE}/auth/token/refresh/`, {
            refresh: refreshToken,
          });
          const newAccessToken = data.access || data.access_token;
          if (newAccessToken) {
            localStorage.setItem('access_token', newAccessToken);
            if (error.config.headers) {
              error.config.headers.Authorization = `Bearer ${newAccessToken}`;
            }
            return api.request(error.config);
          }
        } catch {
          localStorage.removeItem('access_token');
          localStorage.removeItem('refresh_token');
          window.location.href = '/login';
        }
      }
    }
    return Promise.reject(error);
  }
);

export default api;
