import { createContext, useContext, useEffect, useState, ReactNode } from 'react';

interface DarkModeContextType {
  isDarkMode: boolean;
  toggleDarkMode: () => void;
}

const DarkModeContext = createContext<DarkModeContextType | undefined>(undefined);

export function DarkModeProvider({ children }: { children: ReactNode }) {
  const getSystemDarkMode = () =>
    typeof window !== 'undefined' && window.matchMedia('(prefers-color-scheme: dark)').matches;

  const [themePreference, setThemePreference] = useState<'system' | 'light' | 'dark'>(() => {
    const saved = localStorage.getItem('themePreference');
    return saved === 'light' || saved === 'dark' || saved === 'system' ? saved : 'system';
  });
  const [isDarkMode, setIsDarkMode] = useState(() => {
    if (themePreference === 'dark') return true;
    if (themePreference === 'light') return false;
    return getSystemDarkMode();
  });

  useEffect(() => {
    if (themePreference !== 'system') return;

    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    const onChange = (event: MediaQueryListEvent) => setIsDarkMode(event.matches);
    mediaQuery.addEventListener('change', onChange);
    setIsDarkMode(mediaQuery.matches);

    return () => mediaQuery.removeEventListener('change', onChange);
  }, [themePreference]);

  useEffect(() => {
    if (themePreference === 'dark') setIsDarkMode(true);
    if (themePreference === 'light') setIsDarkMode(false);
  }, [themePreference]);

  useEffect(() => {
    if (isDarkMode) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
    localStorage.setItem('themePreference', themePreference);
    localStorage.removeItem('darkMode');
  }, [isDarkMode, themePreference]);

  const toggleDarkMode = () => {
    setThemePreference((prev) => {
      if (prev === 'system') return isDarkMode ? 'light' : 'dark';
      return prev === 'dark' ? 'light' : 'dark';
    });
  };

  return (
    <DarkModeContext.Provider value={{ isDarkMode, toggleDarkMode }}>
      {children}
    </DarkModeContext.Provider>
  );
}

export function useDarkMode() {
  const context = useContext(DarkModeContext);
  if (!context) {
    throw new Error('useDarkMode must be used within DarkModeProvider');
  }
  return context;
}
