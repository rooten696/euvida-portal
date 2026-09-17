import { affiliateLabels, getAffiliateOffers } from '@/lib/affiliateOffers';
import type { SupportedLocale } from '@/lib/articleTypes';

export default function ArticlePartnerOffers({ slug, locale }: { slug: string; locale: SupportedLocale }) {
  const offers = getAffiliateOffers(slug, locale);
  if (offers.length === 0) return null;
  const text = affiliateLabels[locale];

  return (
    <section id="partner-offers" aria-labelledby="partner-offers-title" className="scroll-mb-24 border-y border-slate-500/25 py-6 lg:scroll-mb-0">
      <p className="text-xs font-semibold text-slate-400">{text.label}</p>
      <h2 id="partner-offers-title" className="mt-1 text-xl font-bold text-white">{text.heading}</h2>
      <p className="mt-2 text-xs leading-5 text-slate-400">{text.disclosure}</p>
      <ul className="mt-4 grid gap-3">
        {offers.map(offer => (
          <li key={offer.id} className="min-w-0 rounded-lg border border-slate-500/25 bg-slate-900 p-4 md:p-5">
            <p className="text-xs font-semibold text-slate-400">{offer.provider}</p>
            <h3 className="mt-1 break-words text-lg font-bold text-white">{offer.title}</h3>
            <p className="mt-2 text-sm leading-6 text-slate-300">{offer.description}</p>
            <a
              href={offer.href}
              target="_blank"
              rel="sponsored nofollow noopener noreferrer"
              aria-label={`${offer.action}: ${offer.title} (${offer.provider}). ${text.newTab}`}
              className="mt-4 inline-flex min-h-11 max-w-full items-center gap-2 rounded-lg border border-emerald-500/40 bg-emerald-500/10 px-4 py-2 text-sm font-semibold text-emerald-500 hover:bg-emerald-500/5 hover:underline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-emerald-500"
            >
              <span className="min-w-0 break-words">{offer.action}</span>
              <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="h-4 w-4 shrink-0">
                <path strokeLinecap="round" strokeLinejoin="round" d="M7 7h10v10M7 17 17 7" />
              </svg>
            </a>
          </li>
        ))}
      </ul>
    </section>
  );
}
