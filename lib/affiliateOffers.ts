import catalog from '@/data/affiliate-offers.json';
import generatedLinks from '@/data/affiliate-links.json';
import { isValidAffiliateUrl } from '@/lib/affiliate-link-validation.mjs';
import { buildDestinationSubId } from '@/lib/destination-promotions.mjs';
import type {
  Article,
  LegacyPracticalInfoPartnerOffers,
  PartnerOffer,
  SupportedLocale,
} from '@/lib/articleTypes';

type Offer = {
  id: string;
  provider: string;
  title: Record<SupportedLocale, string>;
  description: Record<SupportedLocale, string>;
};

type LinkRecord = { url: string; sourceUrl: string; subId: string };
type LinkCatalog = Record<string, Partial<Record<SupportedLocale, Record<string, LinkRecord>>>>;

export const affiliateLabels = {
  cs: {
    heading: 'Naplánujte si pobyt',
    regionHeading: 'Naplánujte si cestu do regionu',
    countryHeading: 'Naplánujte si cestu do země',
    label: 'Partnerské nabídky',
    stayAction: 'Vybrat ubytování',
    activityAction: 'Ověřit termín a cenu',
    flightAction: 'Najít letenky',
    carAction: 'Půjčit auto',
    newTab: 'Otevře se v nové záložce',
    disclosure: 'Při rezervaci přes tyto odkazy může Euvida získat provizi. Cenu a podmínky rezervace ověřte u partnera.',
  },
  en: {
    heading: 'Plan your stay',
    regionHeading: 'Plan your trip to the region',
    countryHeading: 'Plan your trip to the country',
    label: 'Affiliate offers',
    stayAction: 'Find a place to stay',
    activityAction: 'Check dates and prices',
    flightAction: 'Find flights',
    carAction: 'Rent a car',
    newTab: 'Opens in a new tab',
    disclosure: 'Euvida may earn a commission when you book through these links. Check prices and booking terms with the partner.',
  },
  de: {
    heading: 'Planen Sie Ihren Aufenthalt',
    regionHeading: 'Planen Sie Ihre Reise in die Region',
    countryHeading: 'Planen Sie Ihre Reise in das Land',
    label: 'Partnerangebote',
    stayAction: 'Unterkunft finden',
    activityAction: 'Termine und Preise prüfen',
    flightAction: 'Flüge finden',
    carAction: 'Mietwagen buchen',
    newTab: 'Öffnet sich in einem neuen Tab',
    disclosure: 'Bei einer Buchung über diese Links erhält Euvida möglicherweise eine Provision. Preise und Buchungsbedingungen finden Sie beim Partner.',
  },
  fr: {
    heading: 'Préparez votre séjour',
    regionHeading: 'Préparez votre voyage dans la région',
    countryHeading: 'Préparez votre voyage dans le pays',
    label: 'Offres partenaires',
    stayAction: 'Trouver un hébergement',
    activityAction: 'Voir les dates et les tarifs',
    flightAction: 'Trouver des vols',
    carAction: 'Louer une voiture',
    newTab: "S'ouvre dans un nouvel onglet",
    disclosure: 'Euvida peut percevoir une commission si vous réservez via ces liens. Vérifiez les tarifs et les conditions de réservation auprès du partenaire.',
  },
  es: {
    heading: 'Organiza tu estancia',
    regionHeading: 'Organiza tu viaje a la región',
    countryHeading: 'Organiza tu viaje al país',
    label: 'Ofertas de afiliados',
    stayAction: 'Buscar alojamiento',
    activityAction: 'Consultar fechas y precios',
    flightAction: 'Buscar vuelos',
    carAction: 'Alquilar un coche',
    newTab: 'Se abre en una pestaña nueva',
    disclosure: 'Euvida puede recibir una comisión si reservas a través de estos enlaces. Consulta los precios y las condiciones de reserva con el colaborador.',
  },
} satisfies Record<SupportedLocale, Record<string, string>>;

export function isPromotionPubliclyVisible(
  record: { active?: boolean; start_at?: string | null; end_at?: string | null } | null | undefined,
  now: Date = new Date()
): boolean {
  if (!record || record.active === false) return false;
  if (record.start_at && new Date(record.start_at) > now) return false;
  if (record.end_at && new Date(record.end_at) <= now) return false;
  return true;
}

export function isPlacementPubliclyVisible(
  record: { active?: boolean; start_at?: string | null; end_at?: string | null } | null | undefined,
  now: Date = new Date()
): boolean {
  if (!record || record.active === false) return false;
  if (record.start_at && new Date(record.start_at) > now) return false;
  if (record.end_at && new Date(record.end_at) <= now) return false;
  return true;
}

export function getAffiliateOffers(
  slug: string,
  locale: SupportedLocale,
  article?: Article | null
) {
  if (!Object.hasOwn(affiliateLabels, locale)) return [];

  // 1. Check article_promotions first (new dedicated table model)
  // An article with configured promotion records is authoritative.
  // An empty promotions array (e.g. before migration or when no article_promotions rows exist)
  // must not suppress legacy partner_offers, practical_info fallback, or static catalog fallback.
  if (Array.isArray(article?.promotions) && article.promotions.length > 0) {
    const promotions = article.promotions;
    return promotions
      .filter((promo) => isPromotionPubliclyVisible(promo))
      .flatMap((promo) => {
        const title = promo.title?.[locale];
        const description = promo.description?.[locale];
        if (!title || !description) return [];

        const rawLink = promo.links?.[locale];
        let href: string | undefined;
        let sourceUrl: string | undefined;
        const subId = `eu_${locale}_${slug}_${promo.campaign_id}_end_v1`;

        if (rawLink && typeof rawLink === 'object' && typeof rawLink.url === 'string') {
          href = rawLink.url;
          sourceUrl = rawLink.sourceUrl;
          if (rawLink.subId && rawLink.subId !== subId) return [];
        }

        if (!href || !isValidAffiliateUrl(href, subId, sourceUrl) || new URL(href).hostname !== 'tp.media') {
          return [];
        }

        const action =
          promo.call_to_action?.[locale] ||
          (promo.campaign_id === 'stay'
            ? affiliateLabels[locale].stayAction
            : affiliateLabels[locale].activityAction);

        return [
          {
            id: promo.campaign_id,
            provider: promo.provider,
            title,
            description,
            href,
            subId,
            action,
          },
        ];
      });
  }

  // 2. Transitional check: article.partner_offers or practical_info.partner_offers
  let hasDbOffers = false;
  let dbOffers: PartnerOffer[] = [];
  if (article?.partner_offers !== null && article?.partner_offers !== undefined) {
    hasDbOffers = true;
    dbOffers = Array.isArray(article.partner_offers) ? article.partner_offers : [];
  } else {
    const legacyPracticalInfo = article?.practical_info as
      | LegacyPracticalInfoPartnerOffers
      | null
      | undefined;
    if (legacyPracticalInfo?.partner_offers !== null && legacyPracticalInfo?.partner_offers !== undefined) {
      hasDbOffers = true;
      dbOffers = Array.isArray(legacyPracticalInfo.partner_offers)
        ? legacyPracticalInfo.partner_offers
        : [];
    }
  }

  if (hasDbOffers) {
    return dbOffers.flatMap(offer => {
      const title = offer.title?.[locale];
      const description = offer.description?.[locale];
      if (!title || !description) return [];

      const rawLink = offer.links?.[locale];
      let href: string | undefined;
      let sourceUrl: string | undefined;
      const subId = `eu_${locale}_${slug}_${offer.id}_end_v1`;

      if (rawLink && typeof rawLink === 'object' && typeof rawLink.url === 'string') {
        href = rawLink.url;
        sourceUrl = rawLink.sourceUrl;
        if (rawLink.subId !== subId) return [];
      }

      // DB data is authoritative and must carry its own explicit tracking link. Never
      // borrow a Git-catalog link or render a canonical provider URL without attribution.
      if (!href || !isValidAffiliateUrl(href, subId, sourceUrl) || new URL(href).hostname !== 'tp.media') return [];

      return [{
        id: offer.id,
        provider: offer.provider,
        title,
        description,
        href,
        subId,
        action: offer.id === 'stay' ? affiliateLabels[locale].stayAction : affiliateLabels[locale].activityAction,
      }];
    });
  }


  // 2. Fallback to static catalog / generatedLinks from repository
  const entries = Object.hasOwn(catalog, slug) ? (catalog as Record<string, Offer[]>)[slug] : [];
  const links = Object.hasOwn(generatedLinks.articles, slug)
    ? (generatedLinks.articles as LinkCatalog)[slug]?.[locale]
    : undefined;

  return entries.flatMap(offer => {
    const link = links?.[offer.id];
    if (!link || !offer.title[locale] || !offer.description[locale]) return [];
    const expectedSubId = `eu_${locale}_${slug}_${offer.id}_end_v1`;
    if (link.subId !== expectedSubId || !isValidAffiliateUrl(link.url, expectedSubId, link.sourceUrl) ||
        new URL(link.url).hostname !== 'tp.media') return [];
    return [{
      id: offer.id,
      provider: offer.provider,
      title: offer.title[locale],
      description: offer.description[locale],
      href: link.url,
      subId: link.subId,
      action: offer.id === 'stay' ? affiliateLabels[locale].stayAction : affiliateLabels[locale].activityAction,
    }];
  });
}

export type DestinationPromotion = {
  id?: string;
  campaign_id: string;
  provider: string;
  placement?: string;
  title: Record<string, string>;
  description: Record<string, string>;
  call_to_action?: Record<string, string>;
  links: Record<string, { url: string; subId?: string; sourceUrl?: string }>;
  active?: boolean;
  sort_order?: number;
  start_at?: string | null;
  end_at?: string | null;
};

export function getDestinationAffiliateOffers(
  targetType: 'region' | 'country',
  targetId: string,
  locale: SupportedLocale,
  promotions?: DestinationPromotion[] | null
) {
  if (!Object.hasOwn(affiliateLabels, locale)) return [];
  if (!Array.isArray(promotions) || promotions.length === 0) return [];

  return promotions
    .filter((promo) => isPromotionPubliclyVisible(promo))
    .flatMap((promo) => {
      const title = promo.title?.[locale];
      const description = promo.description?.[locale];
      if (!title || !description) return [];

      const rawLink = promo.links?.[locale];
      let href: string | undefined;
      let sourceUrl: string | undefined;
      let expectedSubId: string;
      try {
        expectedSubId = buildDestinationSubId(targetType, targetId, promo.campaign_id, locale);
      } catch {
        return [];
      }

      if (rawLink && typeof rawLink === 'object' && typeof rawLink.url === 'string') {
        href = rawLink.url;
        sourceUrl = rawLink.sourceUrl;
        if (rawLink.subId && rawLink.subId !== expectedSubId) return [];
      }

      if (!href || !isValidAffiliateUrl(href, expectedSubId, sourceUrl) || new URL(href).hostname !== 'tp.media') {
        return [];
      }

      let defaultAction = affiliateLabels[locale].stayAction;
      if (promo.campaign_id === 'stay') {
        defaultAction = affiliateLabels[locale].stayAction;
      } else if (promo.campaign_id === 'flight' || promo.campaign_id === 'flights') {
        defaultAction = affiliateLabels[locale].flightAction;
      } else if (promo.campaign_id === 'car_rental' || promo.campaign_id === 'cars') {
        defaultAction = affiliateLabels[locale].carAction;
      } else {
        defaultAction = affiliateLabels[locale].activityAction;
      }

      const action = promo.call_to_action?.[locale] || defaultAction;

      return [
        {
          id: promo.campaign_id,
          provider: promo.provider,
          title,
          description,
          href,
          subId: expectedSubId,
          action,
        },
      ];
    });
}

