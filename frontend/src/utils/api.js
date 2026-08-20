import axios from 'axios';

/**
 * Shared axios instance for the STEM Educator user-management API.
 * Attaches the JWT (if present) to every request and redirects to /login on 401.
 */
const api = axios.create({
  baseURL: '/api',
  headers: { 'Content-Type': 'application/json' },
});

export const TOKEN_KEY = 'stem_token';
// The prebuilt hardware-blocks editor (build/editor.html) reads the JWT from
// 'auth_token', so we mirror the token into both keys for cross-app auth.
export const LEGACY_TOKEN_KEY = 'auth_token';

export function getToken() {
  return localStorage.getItem(TOKEN_KEY);
}

export function setToken(token) {
  if (token) {
    localStorage.setItem(TOKEN_KEY, token);
    localStorage.setItem(LEGACY_TOKEN_KEY, token);
  } else {
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(LEGACY_TOKEN_KEY);
  }
  try { window.dispatchEvent(new CustomEvent('authChanged')); } catch (e) {}
}

api.interceptors.request.use((config) => {
  const token = getToken();
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

api.interceptors.response.use(
  (res) => res,
  (err) => {
    const isAuthRequest = err.config?.url?.includes('/auth/login') ||
      err.config?.url?.includes('/auth/register');
    if (err.response?.status === 401 && !window.location.pathname.startsWith('/login') && !isAuthRequest) {
      setToken(null);
      window.location.href = '/login';
    }
    return Promise.reject(err);
  }
);

export default api;
