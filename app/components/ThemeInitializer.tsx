'use client';

import { useEffect } from 'react';

export default function ThemeInitializer() {
  useEffect(() => {
    try {
      if (localStorage.getItem('theme') === 'light') {
        document.documentElement.classList.add('light');
      } else {
        document.documentElement.classList.remove('light');
      }
    } catch {
      // Theme preference is optional; ignore unavailable storage.
    }
  }, []);

  return null;
}
