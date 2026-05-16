'use client';

import { normalizeLocale } from '@/lib/articleLocalization';
import type { SupportedLocale } from '@/lib/articleTypes';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useDeferredValue, useMemo, useState } from 'react';

export type SmartSearchItem = {
  id: string;
  title: string;
  href: string;
  typeLabel: string;
  description?: string | null;
  meta?: string | null;
  keywords?: string[];
  priority?: number;
};

type SmartSearchProps = {
  items: SmartSearchItem[];
  locale: string;
};

const searchCopy: Record<
  SupportedLocale,
  {
    label: string;
    placeholder: string;
    button: string;
    hint: string;
    suggested: string;
    noResults: string;
  }
> = {
  cs: {
    label: 'Vyhledávání na webu',
    placeholder: 'Hledejte místo, zemi nebo region',
    button: 'Hledat',
    hint: 'Zkuste název místa, zemi, region nebo téma.',
    suggested: 'Doporučené výsledky',
    noResults: 'Nic jsme nenašli. Zkuste kratší dotaz nebo jiný název.',
  },
  en: {
    label: 'Site search',
    placeholder: 'Search for a place, country, or region',
    button: 'Search',
    hint: 'Try a place, country, region, or topic.',
    suggested: 'Suggested results',
    noResults: 'No results found. Try a shorter query or another name.',
  },
  de: {
    label: 'Suche auf der Website',
    placeholder: 'Ort, Land oder Region suchen',
    button: 'Suchen',
    hint: 'Suche nach Ort, Land, Region oder Thema.',
    suggested: 'Empfohlene Ergebnisse',
    noResults: 'Keine Ergebnisse gefunden. Versuche einen kürzeren Suchbegriff.',
  },
  fr: {
    label: 'Recherche sur le site',
    placeholder: 'Rechercher un lieu, un pays ou une région',
    button: 'Rechercher',
    hint: 'Essaie un lieu, un pays, une région ou un thème.',
    suggested: 'Résultats suggérés',
    noResults: 'Aucun résultat. Essaie une recherche plus courte ou un autre nom.',
  },
  es: {
    label: 'Buscar en el sitio',
    placeholder: 'Busca un lugar, país o región',
    button: 'Buscar',
    hint: 'Prueba con un lugar, país, región o tema.',
    suggested: 'Resultados sugeridos',
    noResults: 'No encontramos resultados. Prueba con una búsqueda más corta.',
  },
};

function normalizeSearchText(value: string): string {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLocaleLowerCase();
}

function itemHaystack(item: SmartSearchItem): string {
  return normalizeSearchText(
    [
      item.title,
      item.description,
      item.meta,
      item.typeLabel,
      ...(item.keywords ?? []),
    ]
      .filter(Boolean)
      .join(' ')
  );
}

function scoreItem(item: SmartSearchItem, terms: string[]): number {
  const title = normalizeSearchText(item.title);
  const meta = normalizeSearchText(item.meta ?? '');
  const description = normalizeSearchText(item.description ?? '');
  const keywords = normalizeSearchText((item.keywords ?? []).join(' '));
  const haystack = itemHaystack(item);
  let score = item.priority ?? 0;

  for (const term of terms) {
    const looseTerm = term.length >= 5 ? term.slice(0, 5) : term;
    const hasLooseMatch = term.length >= 5 && haystack.includes(looseTerm);

    if (!haystack.includes(term) && !hasLooseMatch) {
      return -1;
    }

    if (title.startsWith(term)) {
      score += 28;
    } else if (title.includes(term)) {
      score += 18;
    } else if (hasLooseMatch && title.includes(looseTerm)) {
      score += 12;
    } else if (meta.includes(term)) {
      score += 10;
    } else if (keywords.includes(term)) {
      score += 8;
    } else if (hasLooseMatch && keywords.includes(looseTerm)) {
      score += 6;
    } else if (description.includes(term)) {
      score += 4;
    }
  }

  return score;
}

export default function SmartSearch({ items, locale }: SmartSearchProps) {
  const router = useRouter();
  const currentLocale = normalizeLocale(locale);
  const copy = searchCopy[currentLocale];
  const [query, setQuery] = useState('');
  const [isOpen, setIsOpen] = useState(false);
  const deferredQuery = useDeferredValue(query);

  const suggestedItems = useMemo(
    () =>
      [...items]
        .sort((left, right) => {
          if ((right.priority ?? 0) !== (left.priority ?? 0)) {
            return (right.priority ?? 0) - (left.priority ?? 0);
          }

          return left.title.localeCompare(right.title, currentLocale);
        })
        .slice(0, 6),
    [currentLocale, items]
  );

  const results = useMemo(() => {
    const normalizedQuery = normalizeSearchText(deferredQuery).trim();

    if (!normalizedQuery) {
      return suggestedItems;
    }

    const terms = normalizedQuery.split(/\s+/).filter(Boolean);

    return items
      .map((item) => ({
        item,
        score: scoreItem(item, terms),
      }))
      .filter((result) => result.score >= 0)
      .sort((left, right) => {
        if (right.score !== left.score) {
          return right.score - left.score;
        }

        return left.item.title.localeCompare(right.item.title, currentLocale);
      })
      .slice(0, 8)
      .map((result) => result.item);
  }, [currentLocale, deferredQuery, items, suggestedItems]);

  const hasQuery = query.trim().length > 0;
  const firstResult = hasQuery ? results[0] : null;

  return (
    <div
      className="relative z-30 w-full max-w-3xl"
      onBlur={(event) => {
        if (!event.currentTarget.contains(event.relatedTarget as Node | null)) {
          setIsOpen(false);
        }
      }}
    >
      <form
        role="search"
        onSubmit={(event) => {
          event.preventDefault();

          if (firstResult) {
            router.push(firstResult.href);
            setIsOpen(false);
          }
        }}
      >
        <label htmlFor="site-search" className="sr-only">
          {copy.label}
        </label>
        <div className="flex flex-col gap-2 rounded-3xl border border-white/35 bg-white p-2 shadow-2xl shadow-slate-950/25 sm:flex-row">
          <input
            id="site-search"
            type="search"
            value={query}
            onChange={(event) => {
              setQuery(event.target.value);
              setIsOpen(true);
            }}
            onFocus={() => setIsOpen(true)}
            placeholder={copy.placeholder}
            autoComplete="off"
            className="min-h-12 flex-1 rounded-2xl border border-transparent bg-slate-50 px-4 text-base font-semibold text-slate-950 outline-none transition placeholder:text-slate-500 focus:border-blue-200 focus:bg-white focus:ring-2 focus:ring-blue-100"
          />
          <button
            type="submit"
            disabled={!firstResult}
            className="min-h-12 rounded-2xl bg-yellow-300 px-6 text-sm font-black text-yellow-950 shadow-sm transition hover:bg-yellow-200 disabled:cursor-not-allowed disabled:bg-slate-200 disabled:text-slate-500"
          >
            {copy.button}
          </button>
        </div>
      </form>

      {isOpen && (
        <div
          id="site-search-results"
          className="absolute left-0 right-0 top-full mt-3 overflow-hidden rounded-3xl border border-slate-200 bg-white text-slate-950 shadow-2xl shadow-slate-950/20"
        >
          <div className="border-b border-slate-100 px-4 py-3 text-xs font-bold uppercase tracking-wide text-slate-500">
            {hasQuery ? copy.hint : copy.suggested}
          </div>
          {results.length > 0 ? (
            <div className="max-h-[22rem] overflow-y-auto p-2">
              {results.map((item) => (
                <Link
                  key={`${item.href}-${item.id}`}
                  href={item.href}
                  onClick={() => setIsOpen(false)}
                  className="block rounded-2xl px-4 py-3 transition hover:bg-blue-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
                >
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="rounded-full bg-blue-50 px-2.5 py-1 text-[11px] font-black uppercase tracking-wide text-blue-800">
                      {item.typeLabel}
                    </span>
                    {item.meta && (
                      <span className="text-xs font-bold text-slate-500">{item.meta}</span>
                    )}
                  </div>
                  <div className="mt-1 text-sm font-black text-slate-950">{item.title}</div>
                  {item.description && (
                    <p className="mt-1 line-clamp-2 text-sm leading-relaxed text-slate-600">
                      {item.description}
                    </p>
                  )}
                </Link>
              ))}
            </div>
          ) : (
            <div className="px-5 py-6 text-sm font-semibold text-slate-600">
              {copy.noResults}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
