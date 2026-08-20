import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import api, { getToken, setToken } from '../utils/api';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  // Sync user to localStorage for cross-app auth (editor reads auth_user)
  const syncUser = useCallback((u) => {
    if (u) {
      localStorage.setItem('auth_user', JSON.stringify(u));
    } else {
      localStorage.removeItem('auth_user');
    }
  }, []);

  // On mount, capture any SSO token from the URL fragment (#token=...)
  useEffect(() => {
    if (window.location.hash.startsWith('#token=')) {
      const token = decodeURIComponent(window.location.hash.slice('#token='.length));
      setToken(token);
      window.history.replaceState(null, '', window.location.pathname);
      // Redirect to the hardware editor.
      window.location.href = '/editor.html';
    }
  }, []);

  // Load current user if a token exists.
  useEffect(() => {
    let active = true;
    (async () => {
      if (!getToken()) {
        setLoading(false);
        return;
      }
      try {
        const { data } = await api.get('/auth/me');
        if (active) {
          setUser(data.user);
          syncUser(data.user);
        }
      } catch {
        setToken(null);
        syncUser(null);
      } finally {
        if (active) setLoading(false);
      }
    })();
    return () => {
      active = false;
    };
  }, [syncUser]);

  const login = useCallback(async (email, password) => {
    const { data } = await api.post('/auth/login', { email, password });
    setToken(data.token);
    setUser(data.user);
    syncUser(data.user);
    return data.user;
  }, [syncUser]);

  const register = useCallback(async (payload) => {
    const { data } = await api.post('/auth/register', payload);
    setToken(data.token);
    setUser(data.user);
    syncUser(data.user);
    return data.user;
  }, [syncUser]);

  const logout = useCallback(() => {
    setToken(null);
    setUser(null);
    syncUser(null);
    window.location.href = '/login';
  }, [syncUser]);

  const isAdmin = !!user && ['admin', 'System Admin', 'Super Admin', 'Tenant Admin'].includes(user.role);

  return (
    <AuthContext.Provider value={{ user, loading, login, register, logout, setUser, isAdmin }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
