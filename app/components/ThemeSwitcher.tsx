'use client';

import { useEffect, useState } from 'react';
import { applyTheme, getStoredOrAutomaticTheme, THEME_STORAGE_KEY, type ThemePreference } from './themePreference';

export default function ThemeSwitcher() {
  const [theme, setTheme] = useState<ThemePreference>('dark');
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setTimeout(() => {
      setMounted(true);
      const activeTheme = getStoredOrAutomaticTheme();
      setTheme(activeTheme);
      applyTheme(activeTheme);
    }, 0);
  }, []);

  const toggleTheme = () => {
    const nextTheme = theme === 'dark' ? 'light' : 'dark';
    setTheme(nextTheme);
    localStorage.setItem(THEME_STORAGE_KEY, nextTheme);
    applyTheme(nextTheme);
  };

  if (!mounted) {
    return (
      <div className="w-10 h-10 rounded-full bg-white/10 border border-white/20 animate-pulse" />
    );
  }

  return (
    <button
      onClick={toggleTheme}
      className="inline-flex items-center justify-center w-10 h-10 rounded-full bg-white/10 text-white shadow-sm ring-1 ring-inset ring-white/20 hover:bg-white/20 transition-all duration-300 focus:outline-none backdrop-blur-md relative overflow-hidden group cursor-pointer"
      aria-label="Toggle theme"
    >
      <div className="relative w-5 h-5 flex items-center justify-center">
        {theme === 'dark' ? (
          // Moon icon (Emerald color to match dark accent style)
          <svg
            className="w-5 h-5 text-emerald-400 group-hover:text-emerald-300 transition-colors duration-200"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={2}
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z"
            />
          </svg>
        ) : (
          // Sun icon (Amber/Orange color for light theme)
          <svg
            className="w-5 h-5 text-amber-500 group-hover:text-amber-400 transition-colors duration-200"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={2}
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364-6.364l-.707.707M6.343 17.657l-.707.707m12.728 0l-.707-.707M6.343 6.343l-.707-.707M14 12a2 2 0 11-4 0 2 2 0 014 0z"
            />
          </svg>
        )}
      </div>
    </button>
  );
}
