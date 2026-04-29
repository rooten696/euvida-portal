import { getRequestConfig } from 'next-intl/server';
import { notFound } from 'next/navigation';

// 1. Definujeme si povolené jazyky
const locales = ['cs', 'en', 'de', 'es', 'fr'];

export default getRequestConfig(async ({ requestLocale }) => {
  // 2. Počkáme na vyřešení requestLocale (v novějších verzích Next.js je to Promise)
  const locale = await requestLocale;

  // 3. Kontrola, jestli je jazyk v našem seznamu
  if (!locale || !locales.includes(locale as string)) {
    notFound(); // Pokud jazyk neznáme, hodíme 404 (middleware by to měl odchytit dřív)
  }

  return {
    locale, // Předáme vybraný jazyk dál
    messages: (await import(`./messages/${locale}.json`)).default
  };
});