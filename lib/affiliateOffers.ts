import catalog from '@/data/affiliate-offers.json';
import generatedLinks from '@/data/affiliate-links.json';
import type { SupportedLocale } from '@/lib/articleTypes';

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
    label: 'Partnerské nabídky',
    stayAction: 'Vybrat ubytování',
    activityAction: 'Ověřit termín a cenu',
    newTab: 'Otevře se v nové záložce',
    disclosure: 'Při rezervaci přes tyto odkazy může Euvida získat provizi. Cenu a podmínky rezervace ověřte u partnera.',
  },
  en: {
    heading: 'Plan your stay',
    label: 'Affiliate offers',
    stayAction: 'Find a place to stay',
    activityAction: 'Check dates and prices',
    newTab: 'Opens in a new tab',
    disclosure: 'Euvida may earn a commission when you book through these links. Check prices and booking terms with the partner.',
  },
  de: {
    heading: 'Planen Sie Ihren Aufenthalt',
    label: 'Partnerangebote',
    stayAction: 'Unterkunft finden',
    activityAction: 'Termine und Preise prüfen',
    newTab: 'Öffnet sich in einem neuen Tab',
    disclosure: 'Bei einer Buchung über diese Links erhält Euvida möglicherweise eine Provision. Preise und Buchungsbedingungen finden Sie beim Partner.',
  },
  fr: {
    heading: 'Préparez votre séjour',
    label: 'Offres partenaires',
    stayAction: 'Trouver un hébergement',
    activityAction: 'Voir les dates et les tarifs',
    newTab: "S'ouvre dans un nouvel onglet",
    disclosure: 'Euvida peut percevoir une commission si vous réservez via ces liens. Vérifiez les tarifs et les conditions de réservation auprès du partenaire.',
  },
  es: {
    heading: 'Organiza tu estancia',
    label: 'Ofertas de afiliados',
    stayAction: 'Buscar alojamiento',
    activityAction: 'Consultar fechas y precios',
    newTab: 'Se abre en una pestaña nueva',
    disclosure: 'Euvida puede recibir una comisión si reservas a través de estos enlaces. Consulta los precios y las condiciones de reserva con el colaborador.',
  },
} satisfies Record<SupportedLocale, Record<string, string>>;

export function getAffiliateOffers(slug: string, locale: SupportedLocale) {
  const entries = Object.hasOwn(catalog, slug) ? (catalog as Record<string, Offer[]>)[slug] : [];
  const links = Object.hasOwn(generatedLinks.articles, slug)
    ? (generatedLinks.articles as LinkCatalog)[slug]?.[locale]
    : undefined;

  return entries.flatMap(offer => {
    const link = links?.[offer.id];
    if (!link || !offer.title[locale] || !offer.description[locale]) return [];
    try {
      const url = new URL(link.url);
      if (url.protocol !== 'https:' || url.hostname !== 'tp.media' || url.username || url.password) return [];
    } catch {
      return [];
    }
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
