import { getArticleLabel } from '@/lib/articleLabels';
import {
  getTrailHighlightGroup,
  getVisitInfoCards,
  getVisitSafetyNote,
} from '@/lib/articleDisplay';
import { normalizeLocale } from '@/lib/articleLocalization';
import type { Article } from '@/lib/articleTypes';

type QuickOverviewProps = {
  locale: string;
  article: Pick<Article, 'visit_info' | 'practical_info'>;
};

export default function QuickOverview({ locale, article }: QuickOverviewProps) {
  const currentLocale = normalizeLocale(locale);
  const cards = getVisitInfoCards(article, currentLocale);
  const safetyNote = getVisitSafetyNote(article, currentLocale);
  const trailHighlights = getTrailHighlightGroup(article, currentLocale);

  if (cards.length === 0 && !safetyNote && !trailHighlights) {
    return null;
  }

  return (
    <section className="rounded-2xl border border-blue-100 bg-blue-50/70 p-5 shadow-sm">
      <h2 className="mb-4 text-lg font-extrabold text-blue-950">
        {getArticleLabel(currentLocale, 'quickInfo')}
      </h2>

      {safetyNote && (
        <div className="mb-4 rounded-xl border border-red-100 bg-red-50 p-3">
          <h3 className="text-sm font-extrabold text-red-950">
            {safetyNote.label}
          </h3>
          <p className="mt-1 break-words text-sm leading-relaxed text-red-900">
            {safetyNote.text}
          </p>
        </div>
      )}

      {cards.length > 0 && (
        <dl className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {cards.map((card) => (
            <div key={card.label} className="min-w-0 rounded-xl bg-white/80 p-3 shadow-sm shadow-blue-950/5">
              <dt className="text-xs font-bold uppercase tracking-wide text-blue-700">
                {card.label}
              </dt>
              <dd className="mt-1 break-words text-sm font-semibold leading-relaxed text-slate-900">
                {card.value}
              </dd>
              {card.note && (
                <p className="mt-1 break-words text-sm leading-relaxed text-slate-600">
                  {card.note}
                </p>
              )}
            </div>
          ))}
        </dl>
      )}

      {trailHighlights && (
        <div className="mt-4 border-t border-blue-100 pt-4">
          <h3 className="text-sm font-extrabold text-blue-950">
            {trailHighlights.label}
          </h3>
          <ul className="mt-2 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
            {trailHighlights.items.map((trail) => (
              <li key={trail} className="rounded-xl bg-white/80 p-3 text-sm font-semibold leading-relaxed text-slate-900 shadow-sm shadow-blue-950/5">
                {trail}
              </li>
            ))}
          </ul>
        </div>
      )}
    </section>
  );
}
