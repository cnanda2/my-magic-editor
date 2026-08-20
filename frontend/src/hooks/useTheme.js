import { useState, useCallback, useEffect } from 'react';

const STORAGE_KEY = 'theme';

export function useTheme() {
  const [theme, setThemeState] = useState(() => {
    return localStorage.getItem(STORAGE_KEY) || 'dark';
  });

  useEffect(() => {
    document.documentElement.classList.toggle('dark', theme === 'dark');
    localStorage.setItem(STORAGE_KEY, theme);
  }, [theme]);

  const toggleTheme = useCallback(() => {
    setThemeState((prev) => (prev === 'dark' ? 'light' : 'dark'));
  }, []);

  const setTheme = useCallback((t) => {
    setThemeState(t);
  }, []);

  return { theme, toggleTheme, setTheme };
}

export default useTheme;
