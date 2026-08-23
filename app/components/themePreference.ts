export type ThemePreference = 'dark' | 'light';

export const THEME_STORAGE_KEY = 'theme';

export function getAutomaticTheme(date = new Date()): ThemePreference {
  const hour = date.getHours();
  return hour >= 7 && hour < 20 ? 'light' : 'dark';
}

export function applyTheme(theme: ThemePreference) {
  if (theme === 'light') {
    document.documentElement.classList.add('light');
  } else {
    document.documentElement.classList.remove('light');
  }
}

export function getStoredOrAutomaticTheme(): ThemePreference {
  try {
    const savedTheme = localStorage.getItem(THEME_STORAGE_KEY);
    return savedTheme === 'dark' || savedTheme === 'light' ? savedTheme : getAutomaticTheme();
  } catch {
    return getAutomaticTheme();
  }
}
