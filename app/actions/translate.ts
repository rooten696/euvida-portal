'use server';

import * as deepl from 'deepl-node';

const authKey = process.env.DEEPL_API_KEY;

type CountryTextFields = {
  name: string;
  description: string;
  general_info: string;
  travel_tourism: string;
  life_work: string;
  culture_food: string;
};

type RegionTextFields = {
  name: string;
  description: string;
  general_info: string;
  nature_and_landscapes: string;
  history_and_culture: string;
  transport_and_life: string;
};

// 🛡️ NAŠE POJISTKA: Bezpečný překlad, který ignoruje prázdná políčka
async function safeTranslate(translator: deepl.Translator, text: string, source: deepl.SourceLanguageCode, target: deepl.TargetLanguageCode) {
  if (!text || text.trim() === '') return ''; // Pokud je pole prázdné, vůbec nevoláme API
  const result = await translator.translateText(text, source, target);
  return result.text;
}

// 🤖 OSTRÁ FUNKCE PRO PŘEKLAD JEDNOHO POLE (Už žádné [CS] závorky!)
export async function translateSingleText(text: string, sourceLang: 'cs' | 'en') {
  if (!authKey) throw new Error('Chybí DEEPL_API_KEY v .env.local');

  const translator = new deepl.Translator(authKey);
  
  // Našich 5 hlavních jazyků
  const languages: deepl.TargetLanguageCode[] = ['en-GB', 'de', 'es', 'fr', 'cs'];
  // Odfiltrujeme zdrojový jazyk
  const targetLanguages = languages.filter(l => l.split('-')[0] !== sourceLang);
  const sourceDeepL: deepl.SourceLanguageCode = sourceLang === 'cs' ? 'cs' : 'en';

  const results: Record<string, string> = {};

  try {
    for (const target of targetLanguages) {
      const shortLang = target.split('-')[0];
      // Tady už voláme naostro tvou safeTranslate funkci
      results[shortLang] = await safeTranslate(translator, text, sourceDeepL, target);
    }
    return results;
} catch (error: any) { // Změněno na error: any, abychom mohli vytáhnout zprávu
    console.error("Chyba DeepL (Single Text):", error);
    // TADY JE TA ZMĚNA - posíláme skutečnou chybu z DeepL ven
    throw new Error(`Překlad selhal: ${error.message || 'Neznámá chyba DeepL API'}`);
  }
}

// 🌍 HROMADNÝ PŘEKLAD CELÉ ZEMĚ
export async function translateCountryData(data: CountryTextFields, sourceLang: 'cs' | 'en') {
  if (!authKey) throw new Error('Chybí DEEPL_API_KEY v .env.local');

  const translator = new deepl.Translator(authKey);
  
  const languages: deepl.TargetLanguageCode[] = ['en-GB', 'de', 'es', 'fr', 'cs'];
  const targetLanguages = languages.filter(l => l.split('-')[0] !== sourceLang);
  const sourceDeepL: deepl.SourceLanguageCode = sourceLang === 'cs' ? 'cs' : 'en';

  const results: Record<string, CountryTextFields> = {
    [sourceLang]: data
  };

  try {
    for (const target of targetLanguages) {
      const shortLang = target.split('-')[0];
      
      results[shortLang] = {
        name: await safeTranslate(translator, data.name, sourceDeepL, target),
        description: await safeTranslate(translator, data.description, sourceDeepL, target),
        general_info: await safeTranslate(translator, data.general_info, sourceDeepL, target),
        travel_tourism: await safeTranslate(translator, data.travel_tourism, sourceDeepL, target),
        life_work: await safeTranslate(translator, data.life_work, sourceDeepL, target),
        culture_food: await safeTranslate(translator, data.culture_food, sourceDeepL, target)
      };
    }
    return results; 
  } catch (error) {
    console.error("Chyba DeepL (Země):", error);
    throw new Error('Překlad země selhal. Zkontroluj API limit.');
  }
}

// 🗺️ HROMADNÝ PŘEKLAD CELÉHO REGIONU
export async function translateRegionData(data: RegionTextFields, sourceLang: 'cs' | 'en') {
  if (!authKey) throw new Error('Chybí DEEPL_API_KEY');

  const translator = new deepl.Translator(authKey);
  
  const languages: deepl.TargetLanguageCode[] = ['en-GB', 'de', 'es', 'fr', 'cs'];
  const targetLanguages = languages.filter(l => l.split('-')[0] !== sourceLang);
  const sourceDeepL: deepl.SourceLanguageCode = sourceLang === 'cs' ? 'cs' : 'en';

  const results: Record<string, RegionTextFields> = {
    [sourceLang]: data
  };

  try {
    for (const target of targetLanguages) {
      const shortLang = target.split('-')[0];
      
      results[shortLang] = {
        name: await safeTranslate(translator, data.name, sourceDeepL, target),
        description: await safeTranslate(translator, data.description, sourceDeepL, target),
        general_info: await safeTranslate(translator, data.general_info, sourceDeepL, target),
        nature_and_landscapes: await safeTranslate(translator, data.nature_and_landscapes, sourceDeepL, target),
        history_and_culture: await safeTranslate(translator, data.history_and_culture, sourceDeepL, target),
        transport_and_life: await safeTranslate(translator, data.transport_and_life, sourceDeepL, target)
      };
    }
    return results;
  } catch (error) {
    console.error("Chyba DeepL (Region):", error);
    throw new Error('Překlad regionu selhal.');
  }
}