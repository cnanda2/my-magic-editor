import { createContext, useContext, useState, useEffect } from 'react';
import api from '../utils/api';

const BrandContext = createContext(null);

export function BrandProvider({ children }) {
  const [brand, setBrand] = useState(null);

  useEffect(() => {
    (async () => {
      try {
        const { data } = await api.get('/tenant/config');
        setBrand(data);
        applyDocBranding(data);
        if (data.designTokens) applyDesignTokens(data.designTokens);
      } catch {
        // use defaults
      }
    })();
  }, []);

  return <BrandContext.Provider value={brand}>{children}</BrandContext.Provider>;
}

export function useBrand() {
  return useContext(BrandContext);
}

function setCSSVar(name, value) {
  if (value !== undefined && value !== null && value !== '') {
    document.documentElement.style.setProperty(name, value);
  }
}

function loadInterFont() {
  if (document.querySelector('#inter-font-link')) return;
  const link = document.createElement('link');
  link.id = 'inter-font-link';
  link.rel = 'stylesheet';
  link.href = 'https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap';
  document.head.appendChild(link);
}

function applyDesignTokens(tokens) {
  if (!tokens) return;
  loadInterFont();
  const root = document.documentElement;
  root.style.setProperty('--ds-font-family', tokens.fontFamily || "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif");
  root.style.fontFamily = 'var(--ds-font-family)';
  if (tokens.colors) {
    for (const [key, val] of Object.entries(tokens.colors)) {
      setCSSVar(`--ds-${key}`, val);
      if (key === 'primary') setCSSVar('--brand-primary', val);
      if (key === 'secondary') setCSSVar('--brand-secondary', val);
      if (key === 'background') setCSSVar('--brand-background', val);
    }
  }
  if (tokens.typography) {
    for (const [level, props] of Object.entries(tokens.typography)) {
      if (typeof props === 'object') {
        for (const [prop, val] of Object.entries(props)) {
          setCSSVar(`--ds-${level}-${prop}`, String(val));
        }
      }
    }
  }
  if (tokens.rounded) {
    for (const [key, val] of Object.entries(tokens.rounded)) {
      const cssKey = key === 'DEFAULT' ? 'rounded' : `rounded-${key}`;
      setCSSVar(`--ds-${cssKey}`, val);
    }
  }
  if (tokens.spacing) {
    for (const [key, val] of Object.entries(tokens.spacing)) {
      setCSSVar(`--ds-${key}`, val);
    }
  }
}

function applyDocBranding(config) {
  if (!config) return;
  if (config.primaryColor) {
    document.documentElement.style.setProperty('--brand-primary', config.primaryColor);
    const meta = document.querySelector('meta[name="theme-color"]');
    if (meta) meta.setAttribute('content', config.primaryColor);
  }
  if (config.secondaryColor) {
    document.documentElement.style.setProperty('--brand-secondary', config.secondaryColor);
  }
  if (config.appName) {
    document.title = config.appName;
  }
  if (config.faviconUrl) {
    const ext = config.faviconUrl.split('.').pop()?.toLowerCase();
    const mimeType = ext === 'ico' ? 'image/x-icon' : ext === 'svg' ? 'image/svg+xml' : 'image/png';
    // Update in-place if the tagged element exists (no flash), otherwise replace all
    const existing = document.getElementById('favicon-icon');
    if (existing) {
      existing.type = mimeType;
      existing.href = config.faviconUrl;
    } else {
      document.head.querySelectorAll('link[rel="icon"], link[rel="shortcut icon"]').forEach((el) => el.remove());
      const link = document.createElement('link');
      link.id = 'favicon-icon';
      link.rel = 'icon';
      link.type = mimeType;
      link.href = config.faviconUrl;
      document.head.appendChild(link);
    }
  }
}
