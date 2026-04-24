'use server';

import * as deepl from 'deepl-node';

const authKey = process.env.DEEPL_API_KEY;

export async function translateCountryData(data: {
  name: string;
  description: string;
  general_info: string;
  travel_tourism: string;
  life_work: string;
  culture_food: string;
}) {
  if (!authKey) {
    throw new Error('Chybí DEEPL_API_KEY v .env.local');
  }

  const translator = new deepl.Translator(authKey);
  const targetLanguages: deepl.TargetLanguageCode[] = ['en-GB', 'de'];
  const translations: Record<string, Record<string, string>> = {};

  try {
    for (const lang of targetLanguages) {
      const shortLang = lang.split('-')[0]; 
      
      // Přeložíme všechna pole najednou (DeepL umí přijmout pole textů pro úsporu času)
      const textsToTranslate = [
        data.name || '',
        data.description || '',
        data.general_info || '',
        data.travel_tourism || '',
        data.life_work || '',
        data.culture_food || ''
      ];

      const results = await translator.translateText(textsToTranslate, 'cs', lang);

      // Poskládáme to zpátky do úhledného objektu
      translations[shortLang] = {
        name: results[0].text,
        description: results[1].text,
        general_info: results[2].text,
        travel_tourism: results[3].text,
        life_work: results[4].text,
        culture_food: results[5].text
      };
    }

    return translations;

  } catch (error) {
    console.error("Chyba při překladu DeepL:", error);
    throw new Error('Překlad se nezdařil. Zkontroluj API klíč nebo limit.');
  }
}export async function translateRegionData(data: {
  name: string;
  description: string;
  general_info: string;
  nature_and_landscapes: string;
  history_and_culture: string;
  transport_and_life: string;
}) {
  if (!authKey) throw new Error('Chybí DEEPL_API_KEY');

  const translator = new deepl.Translator(authKey);
  const targetLanguages: deepl.TargetLanguageCode[] = ['en-GB', 'de'];
  const translations: Record<string, Record<string, string>> = {};

  try {
    for (const lang of targetLanguages) {
      const shortLang = lang.split('-')[0]; 
      
      const textsToTranslate = [
        data.name || '',
        data.description || '',
        data.general_info || '',
        data.nature_and_landscapes || '',
        data.history_and_culture || '',
        data.transport_and_life || ''
      ];

      const results = await translator.translateText(textsToTranslate, 'cs', lang);

      translations[shortLang] = {
        name: results[0].text,
        description: results[1].text,
        general_info: results[2].text,
        nature_and_landscapes: results[3].text,
        history_and_culture: results[4].text,
        transport_and_life: results[5].text
      };
    }
    return translations;
  } catch (error) {
    console.error("Chyba DeepL:", error);
    throw new Error('Překlad regionu selhal.');
  }
}