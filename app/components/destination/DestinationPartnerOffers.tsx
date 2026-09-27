import { affiliateLabels, getDestinationAffiliateOffers, type DestinationPromotion } from '@/lib/affiliateOffers';
import type { SupportedLocale } from '@/lib/articleTypes';

export default function DestinationPartnerOffers({
  targetType,
  targetId,
  locale,
  destinationName,
  promotions,
}: {
  targetType: 'region' | 'country';
  targetId: string;
  locale: SupportedLocale;
  destinationName?: string;
  promotions?: DestinationPromotion[] | null;
}) {
  const offers = getDestinationAffiliateOffers(targetType, targetId, locale, promotions);
  if (offers.length === 0) return null;
  const text = affiliateLabels[locale];
  const heading = targetType === 'region' ? text.regionHeading : text.countryHeading;

  return (
    <section
      id="partner-offers"
      aria-labelledby="destination-partner-offers-title"
      className="my-12 rounded-2xl border border-white/10 bg-slate-900/60 p-6 shadow-sm backdrop-blur md:p-8"
    >
      <p className="text-xs font-semibold uppercase tracking-wider text-emerald-400">{text.label}</p>
      <h2 id="destination-partner-offers-title" className="mt-1 text-2xl font-black text-white md:text-3xl">
        {destinationName ? `${heading}: ${destinationName}` : heading}
      </h2>
      <p className="mt-2 text-xs leading-5 text-slate-400">{text.disclosure}</p>
      <ul className="mt-6 grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
        {offers.map((offer) => (
          <li
            key={offer.id}
            className="flex flex-col justify-between rounded-xl border border-white/10 bg-slate-900 p-5 shadow-md transition hover:border-emerald-500/30"
          >
            <div>
              <span className="inline-block rounded-md bg-white/5 border border-white/10 px-2 py-0.5 text-xs font-semibold text-slate-300">
                {offer.provider}
              </span>
              <h3 className="mt-2 break-words text-lg font-bold text-white">{offer.title}</h3>
              <p className="mt-2 text-sm leading-6 text-slate-300">{offer.description}</p>
            </div>
            <div className="mt-5 pt-3 border-t border-white/5">
              <a
                href={offer.href}
                target="_blank"
                rel="sponsored nofollow noopener noreferrer"
                aria-label={`${offer.action}: ${offer.title} (${offer.provider}). ${text.newTab}`}
                className="inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-lg border border-emerald-500/40 bg-emerald-500/10 px-4 py-2 text-sm font-semibold text-emerald-400 hover:bg-emerald-500/20 hover:text-emerald-300 transition focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-emerald-500"
              >
                <span className="truncate">{offer.action}</span>
                <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="h-4 w-4 shrink-0">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M7 7h10v10M7 17 17 7" />
                </svg>
              </a>
            </div>
          </li>
        ))}
      </ul>
    </section>
  );
}
