import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';

const KEY = 'dsa-theme';
const COLORS = { light: '#f4f5fa', dark: '#1b2030' };
const ThemeContext = createContext(null);

const read = () => {
  try {
    const saved = localStorage.getItem(KEY);
    if (saved === 'light' || saved === 'dark') return saved;
  } catch {
    /* storage blocked: fall back to system */
  }
  return window.matchMedia?.('(prefers-color-scheme: light)').matches ? 'light' : 'dark';
};

export function ThemeProvider({ children }) {
  const [theme, setTheme] = useState(read);

  // Keep <html data-theme> and the browser UI colour in sync.
  // Transitions are paused for two frames around the switch so the page repaints once, instantly (no lag on long lists).
  useEffect(() => {
    const root = document.documentElement;
    root.classList.add('theme-switching');
    root.setAttribute('data-theme', theme);
    document.querySelector('meta[name="theme-color"]')?.setAttribute('content', COLORS[theme]);
    let id2;
    const id1 = requestAnimationFrame(() => {
      id2 = requestAnimationFrame(() => root.classList.remove('theme-switching'));
    });
    return () => {
      cancelAnimationFrame(id1);
      cancelAnimationFrame(id2);
    };
  }, [theme]);

  // Follow the system setting until the user picks a theme themselves.
  useEffect(() => {
    const mq = window.matchMedia?.('(prefers-color-scheme: light)');
    if (!mq) return undefined;
    const onChange = (e) => {
      try {
        if (localStorage.getItem(KEY)) return;
      } catch {
        /* ignore */
      }
      setTheme(e.matches ? 'light' : 'dark');
    };
    mq.addEventListener('change', onChange);
    return () => mq.removeEventListener('change', onChange);
  }, []);

  const choose = useCallback((next) => {
    setTheme(next);
    try {
      localStorage.setItem(KEY, next);
    } catch {
      /* ignore */
    }
  }, []);

  const toggle = useCallback(() => choose(theme === 'dark' ? 'light' : 'dark'), [choose, theme]);
  const value = useMemo(() => ({ theme, toggle, setTheme: choose }), [theme, toggle, choose]);

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export const useTheme = () => useContext(ThemeContext);
