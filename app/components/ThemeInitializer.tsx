'use client';

import { useEffect } from 'react';
import { applyTheme, getStoredOrAutomaticTheme } from './themePreference';

export default function ThemeInitializer() {
  useEffect(() => {
    try {
      applyTheme(getStoredOrAutomaticTheme());
    } catch {
      // Theme preference is optional; ignore unavailable storage.
    }
  }, []);

  return null;
}
