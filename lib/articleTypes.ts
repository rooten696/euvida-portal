export const supportedLocales = ['cs', 'en', 'de', 'fr', 'es'] as const;

export type SupportedLocale = (typeof supportedLocales)[number];

export type LocalizedText =
  Partial<Record<SupportedLocale, string>> &
  Record<string, string | undefined>;

export type LocalizedField = string | LocalizedText | null | undefined;

export type ArticleTranslation = {
  title?: string | null;
  excerpt?: string | null;
  content?: string | null;
};

export type ArticleTranslations =
  Partial<Record<SupportedLocale, ArticleTranslation>> &
  Record<string, ArticleTranslation | undefined>;

export type PracticalInfoKey =
  | 'best_time'
  | 'time_needed'
  | 'booking'
  | 'crowds'
  | 'transport'
  | 'nearby_prices'
  | 'watch_out'
  | 'accessibility';

export type PracticalInfo =
  Partial<Record<PracticalInfoKey, string>> &
  Record<string, string | undefined>;

export type PracticalInfoLocales =
  Partial<Record<SupportedLocale, PracticalInfo>> &
  Record<string, PracticalInfo | undefined>;

export type PriceType =
  | 'fixed'
  | 'free'
  | 'from'
  | 'range'
  | 'approx'
  | 'text'
  | 'seasonal';

export type PriceItem = {
  id?: string | number | null;
  category?: string | null;
  price_type?: PriceType | string | null;
  amount?: number | string | null;
  amount_min?: number | string | null;
  amount_max?: number | string | null;
  currency?: string | null;
  unit?: string | null;
  audience?: string | null;
  period?: string | null;
  official?: boolean | null;
  sort_order?: number | string | null;
  label?: LocalizedField;
  note?: LocalizedField;
  text?: LocalizedField;
};

export type PricesInfo = {
  currency?: string | null;
  last_checked?: string | null;
  season_note?: LocalizedField;
  summary?: LocalizedField;
  items?: PriceItem[] | null;
  notes?: LocalizedField;
  booking_url?: string | null;
};

export type AccessMode =
  | 'walk'
  | 'metro'
  | 'tram'
  | 'bus'
  | 'train'
  | 'public_transport'
  | 'train_bus'
  | 'car'
  | 'parking'
  | 'taxi'
  | 'bike'
  | 'ferry'
  | 'boat'
  | 'cable_car'
  | 'funicular'
  | 'shuttle'
  | 'organized_tour'
  | 'plane'
  | 'other';

export type AccessItem = {
  id?: string | number | null;
  mode?: AccessMode | string | null;
  recommended?: boolean | null;
  sort_order?: number | string | null;
  label?: LocalizedField;
  description?: LocalizedField;
  lines?: string[] | null;
  stop_name?: string | null;
  walk_minutes?: number | string | null;
  parking_available?: boolean | null;
  gps?: string | null;
  destination?: LocalizedField;
  roads?: string[] | null;
  note?: LocalizedField;
};

export type AccessInfo = {
  summary?: LocalizedField;
  items?: AccessItem[] | null;
  notes?: LocalizedField;
};

export type VisitInfo = {
  place_type?: string | null;
  recommended_time_minutes_min?: number | string | null;
  recommended_time_minutes_max?: number | string | null;
  crowd_level?: string | null;
  booking_recommended?: boolean | null;
  tickets_online_only?: boolean | null;
  best_time_keys?: string[] | string | null;
  avoid_if_possible_keys?: string[] | string | null;
  swimming_type?: string | null;
  opening_hours_text?: LocalizedField;
  official_opening_hours?: LocalizedField | Record<string, unknown>;
  nudist_beach?: boolean | null;
  nudist_beach_note?: LocalizedField;
  water_quality_note?: LocalizedField;
  family_friendly?: boolean | null;
  dogs_allowed?: boolean | null;
  dogs_allowed_note?: LocalizedField;
  water_nearby?: boolean | null;
  beach_nearby?: boolean | null;
  electric_hookup?: boolean | null;
  kitchen_available?: boolean | null;
  showers_available?: boolean | null;
  washing_machine_available?: boolean | null;
  baby_room_available?: boolean | null;
  shop_available?: boolean | null;
  restaurant_available?: boolean | null;
  campfire_places?: boolean | null;
  trail_network_km?: number | string | null;
  marked_mtb_routes_km?: number | string | null;
  difficulty?: string[] | string | null;
  lift_available?: boolean | null;
  lift_name?: string | null;
  bike_rental_available?: boolean | null;
  scooter_rental_available?: boolean | null;
  bike_school_available?: boolean | null;
  service_available?: boolean | null;
  bike_wash_available?: boolean | null;
  free_parking?: boolean | null;
  beginner_friendly?: boolean | null;
  helmet_required?: boolean | null;
  full_face_required_on_hard_trails?: boolean | null;
  protective_gear_required_on_hard_trails?: boolean | null;
  trail_highlights?: TrailHighlight[] | null;
  safety_note?: LocalizedField;
};

export type TrailHighlight = {
  id?: string | null;
  difficulty?: string | null;
  length_km?: number | string | null;
};

export type ImageCredit = {
  attribution_text?: string | null;
  author_name?: string | null;
  author_url?: string | null;
  license_name?: string | null;
  license_url?: string | null;
  source_name?: string | null;
  source?: string | null;
  source_url?: string | null;
};

export type SourceItem = {
  label?: LocalizedField;
  url?: string | null;
  type?: string | null;
  used_for?: string[] | null;
};

export type SourceInfo = {
  images?: ImageCredit[] | null;
  sources?: SourceItem[] | null;
  last_checked?: string | null;
};

export type Article = {
  id?: string | null;
  slug: string;
  image_url?: string | null;
  image_alt?: LocalizedText | null;
  country_id?: string | null;
  region_id?: string | null;
  category?: string | null;
  title?: string | null;
  excerpt?: string | null;
  content?: string | null;
  translations?: ArticleTranslations | null;
  practical_info?: PracticalInfoLocales | null;
  prices_info?: PricesInfo | null;
  access_info?: AccessInfo | null;
  visit_info?: VisitInfo | null;
  source_info?: SourceInfo | null;
  last_checked_at?: string | null;
  updated_at?: string | null;
  reading_time_minutes?: number | string | null;
  published?: boolean | null;
  featured?: boolean | null;
  created_at?: string | null;
};

export type LocationRecord = {
  id: string;
  name?: string | null;
  country_id?: string | null;
  translations?: Record<string, { name?: string | null } | undefined> | null;
};
