import { normalizeLocale } from './articleLocalization';

export type DestinationTranslations =
  Record<string, Record<string, string | null | undefined> | undefined>;

export type CountryDestination = {
  id: string;
  name?: string | null;
  flag?: string | null;
  description?: string | null;
  image_url?: string | null;
  general_info?: string | null;
  travel_tourism?: string | null;
  life_work?: string | null;
  culture_food?: string | null;
  practical_cautions?: string | null;
  translations?: DestinationTranslations | null;
};

export type RegionDestination = {
  id: string;
  country_id: string;
  name?: string | null;
  language?: string | null;
  description?: string | null;
  image_url?: string | null;
  temp_spring_air?: string | null;
  temp_summer_air?: string | null;
  temp_autumn_air?: string | null;
  temp_winter_air?: string | null;
  temp_spring_sea?: string | null;
  temp_summer_sea?: string | null;
  temp_autumn_sea?: string | null;
  temp_winter_sea?: string | null;
  general_info?: string | null;
  nature_and_landscapes?: string | null;
  history_and_culture?: string | null;
  transport_and_life?: string | null;
  translations?: DestinationTranslations | null;
};

export type WeatherData = {
  weather?: {
    icon?: string;
    description?: string;
  }[];
  main?: {
    temp?: number;
  };
};

function cleanText(value: string | null | undefined): string | null {
  if (!value) {
    return null;
  }

  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

export function getTranslatedField<T extends { translations?: DestinationTranslations | null }>(
  item: T,
  field: keyof T & string,
  locale: string
): string | null {
  const currentLocale = normalizeLocale(locale);
  const translation = item.translations?.[currentLocale]?.[field];
  const fallback = item.translations?.cs?.[field];
  const baseValue = item[field];

  return (
    cleanText(translation) ??
    cleanText(fallback) ??
    (typeof baseValue === 'string' ? cleanText(baseValue) : null)
  );
}

export function getCountryDisplay(country: CountryDestination, locale: string) {
  return {
    ...country,
    name: getTranslatedField(country, 'name', locale) ?? country.name ?? '',
    description: getTranslatedField(country, 'description', locale) ?? country.description ?? '',
    general_info: getTranslatedField(country, 'general_info', locale),
    travel_tourism: getTranslatedField(country, 'travel_tourism', locale),
    life_work: getTranslatedField(country, 'life_work', locale),
    culture_food: getTranslatedField(country, 'culture_food', locale),
    practical_cautions: getTranslatedField(country, 'practical_cautions', locale),
  };
}

export function getRegionDisplay(region: RegionDestination, locale: string) {
  return {
    ...region,
    name: getTranslatedField(region, 'name', locale) ?? region.name ?? '',
    description: getTranslatedField(region, 'description', locale) ?? region.description ?? '',
    general_info: getTranslatedField(region, 'general_info', locale),
    nature_and_landscapes: getTranslatedField(region, 'nature_and_landscapes', locale),
    history_and_culture: getTranslatedField(region, 'history_and_culture', locale),
    transport_and_life: getTranslatedField(region, 'transport_and_life', locale),
    temp_spring_air: getTranslatedField(region, 'temp_spring_air', locale),
    temp_summer_air: getTranslatedField(region, 'temp_summer_air', locale),
    temp_autumn_air: getTranslatedField(region, 'temp_autumn_air', locale),
    temp_winter_air: getTranslatedField(region, 'temp_winter_air', locale),
    temp_spring_sea: getTranslatedField(region, 'temp_spring_sea', locale),
    temp_summer_sea: getTranslatedField(region, 'temp_summer_sea', locale),
    temp_autumn_sea: getTranslatedField(region, 'temp_autumn_sea', locale),
    temp_winter_sea: getTranslatedField(region, 'temp_winter_sea', locale),
  };
}

export function hasTemperature(value: string | null | undefined): value is string {
  return Boolean(value && value.trim() !== '' && value !== 'N/A');
}
