import {getRequestConfig} from 'next-intl/server';

const locales = ['cs', 'en'];

export default getRequestConfig(async ({requestLocale}) => {
  // OPRAVA: Změněno 'let' na 'const'
  const locale = await requestLocale;

  // Pokud přijde nesmysl, přepneme ho na 'cs'
  const currentLocale = (locale && locales.includes(locale)) ? locale : 'cs';
  
  console.log("➡️ PŘEKLADAČ VIDÍ JAZYK:", currentLocale);

  return {
    locale: currentLocale,
    messages: (await import(`./messages/${currentLocale}.json`)).default
  };
});