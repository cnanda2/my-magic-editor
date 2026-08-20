const API_BASE = '/api/auth';

export function getToken() {
  return localStorage.getItem('auth_token');
}

export function getUser() {
  try {
    return JSON.parse(localStorage.getItem('auth_user'));
  } catch {
    return null;
  }
}

export function setAuth(token, user) {
  localStorage.setItem('auth_token', token);
  localStorage.setItem('auth_user', JSON.stringify(user));
  try { window.dispatchEvent(new CustomEvent('authChanged')); } catch (e) {}
}

export function clearAuth() {
  localStorage.removeItem('auth_token');
  localStorage.removeItem('auth_user');
  try { window.dispatchEvent(new CustomEvent('authChanged')); } catch (e) {}
}

export function isLoggedIn() {
  return !!getToken();
}

async function request(method, path, body) {
  const headers = { 'Content-Type': 'application/json' };
  const token = getToken();
  if (token) headers['Authorization'] = 'Bearer ' + token;
  const res = await fetch(API_BASE + path, { method, headers, body: body ? JSON.stringify(body) : undefined });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Request failed');
  return data;
}

export async function login(username, password) {
  const data = await request('POST', '/login', { username, password });
  setAuth(data.token, data.user);
  return data.user;
}

export async function register(username, email, password) {
  const data = await request('POST', '/register', { username, email, password });
  setAuth(data.token, data.user);
  return data.user;
}

export function logout() {
  clearAuth();
}

export async function fetchMe() {
  const data = await request('GET', '/me');
  return data.user;
}

export async function verifyAuth() {
  if (!getToken()) return false;
  try {
    const data = await request('GET', '/me');
    setAuth(getToken(), data.user);
    return true;
  } catch {
    clearAuth();
    return false;
  }
}

export async function fetchUser() {
  const token = getToken();
  if (!token) return null;
  if (getUser()) return getUser();
  try {
    const data = await request('GET', '/me');
    setAuth(token, data.user);
    return data.user;
  } catch (e) {
    if (getUser()) return getUser();
    return null;
  }
}
