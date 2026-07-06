'use client';

import { supabase } from '@/lib/supabaseBrowserClient';
import { useState, useEffect, useCallback } from 'react';
import { useLocale } from 'next-intl';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import SafeImage from '@/app/components/SafeImage';
import { getCountryDisplay, getRegionDisplay } from '@/lib/destinationTypes';
import { getLocalizedArticle } from '@/lib/articleLocalization';

type SavedCountry = {
  id: string;
  name: string;
  flag: string;
  description: string;
  image_url: string;
};

type SavedRegion = {
  id: string;
  name: string;
  description: string;
  image_url: string;
  country_id: string;
};

type SavedArticle = {
  slug: string;
  title: string;
  excerpt: string | null;
  image_url: string;
  category: string;
};

const getLocalFavorites = (uid: string | null) => {
  if (typeof window === 'undefined') return { countries: [], regions: [], articles: [] };
  const key = `euvida_favs_${uid || 'guest'}`;
  try {
    const data = localStorage.getItem(key);
    return data ? JSON.parse(data) : { countries: [], regions: [], articles: [] };
  } catch (e) {
    return { countries: [], regions: [], articles: [] };
  }
};

const saveLocalFavorites = (uid: string | null, favs: any) => {
  if (typeof window === 'undefined') return;
  const key = `euvida_favs_${uid || 'guest'}`;
  try {
    localStorage.setItem(key, JSON.stringify(favs));
  } catch (e) {}
};

export default function FavoritesPage() {
  const locale = useLocale();
  const [countries, setCountries] = useState<SavedCountry[]>([]);
  const [regions, setRegions] = useState<SavedRegion[]>([]);
  const [articles, setArticles] = useState<SavedArticle[]>([]);
  const [activeTab, setActiveTab] = useState<'countries' | 'regions' | 'articles'>('countries');
  const [loading, setLoading] = useState(true);
  const [userId, setUserId] = useState<string | null>(null);
  const router = useRouter();

  const fetchFavorites = useCallback(async (uid: string) => {
    // 1. Countries (Supabase + LocalStorage fallback)
    const { data: dbCountryData } = await supabase
      .from('favorites')
      .select('country_id')
      .eq('user_id', uid);

    const localFavs = getLocalFavorites(uid);
    const localCountryIds = localFavs.countries || [];
    const combinedCountryIds = Array.from(new Set([
      ...(dbCountryData || []).map(item => item.country_id),
      ...localCountryIds
    ])).filter(Boolean);

    if (combinedCountryIds.length > 0) {
      const { data: countriesData } = await supabase
        .from('countries')
        .select('id, name, flag, description, image_url, translations')
        .in('id', combinedCountryIds);
      if (countriesData) {
        setCountries(countriesData.map(c => getCountryDisplay(c as any, locale) as SavedCountry));
      }
    }

    // 2. Regions (LocalStorage)
    const savedRegionIds = localFavs.regions || [];
    if (savedRegionIds.length > 0) {
      const { data: regionsData } = await supabase
        .from('regions')
        .select('id, name, description, image_url, country_id, translations')
        .in('id', savedRegionIds);
      if (regionsData) {
        setRegions(regionsData.map(r => getRegionDisplay(r as any, locale) as SavedRegion));
      }
    }

    // 3. Articles (LocalStorage)
    const savedArticleSlugs = localFavs.articles || [];
    if (savedArticleSlugs.length > 0) {
      const { data: articlesData } = await supabase
        .from('articles')
        .select('slug, title, excerpt, image_url, category, translations')
        .in('slug', savedArticleSlugs);
      if (articlesData) {
        setArticles(articlesData.map(a => {
          const loc = getLocalizedArticle(a as any, locale);
          return {
            slug: a.slug,
            title: loc.title,
            excerpt: loc.excerpt,
            image_url: a.image_url,
            category: a.category
          } as SavedArticle;
        }));
      }
    }

    setLoading(false);
  }, [locale]);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!session?.user) {
        router.push(`/${locale}/login`);
      } else {
        setUserId(session.user.id);
        fetchFavorites(session.user.id);
      }
    });
  }, [fetchFavorites, locale, router]);

  const handleRemoveFavorite = async (type: 'country' | 'region' | 'article', id: string, e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (!userId) return;

    if (type === 'country') {
      await supabase
        .from('favorites')
        .delete()
        .eq('user_id', userId)
        .eq('country_id', id);

      const favs = getLocalFavorites(userId);
      favs.countries = (favs.countries || []).filter((x: string) => x !== id);
      saveLocalFavorites(userId, favs);

      setCountries(prev => prev.filter(c => c.id !== id));
    } else if (type === 'region') {
      const favs = getLocalFavorites(userId);
      favs.regions = (favs.regions || []).filter((x: string) => x !== id);
      saveLocalFavorites(userId, favs);

      setRegions(prev => prev.filter(r => r.id !== id));
    } else if (type === 'article') {
      const favs = getLocalFavorites(userId);
      favs.articles = (favs.articles || []).filter((x: string) => x !== id);
      saveLocalFavorites(userId, favs);

      setArticles(prev => prev.filter(a => a.slug !== id));
    }
  };

  if (loading) {
    return (
      <main className="min-h-screen bg-slate-950 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-emerald-500"></div>
      </main>
    );
  }

  const tabLabels = {
    cs: { countries: 'Země', regions: 'Regiony', articles: 'Články & Tipy' },
    en: { countries: 'Countries', regions: 'Regions', articles: 'Articles & Tips' },
    de: { countries: 'Länder', regions: 'Regionen', articles: 'Artikel & Tipps' },
    fr: { countries: 'Pays', regions: 'Régions', articles: 'Articles & Astuces' },
    es: { countries: 'Países', regions: 'Regiones', articles: 'Artículos y Consejos' }
  }[locale as 'cs'|'en'|'de'|'fr'|'es'] || { countries: 'Země', regions: 'Regiony', articles: 'Články & Tipy' };

  return (
    <main className="min-h-screen bg-slate-950 py-12 px-4 font-sans text-slate-100">
      <div className="max-w-6xl mx-auto">
        <header className="mb-12 text-center space-y-4">
          <h1 className="text-4xl font-black md:text-5xl bg-gradient-to-r from-emerald-400 to-teal-300 bg-clip-text text-transparent flex items-center justify-center gap-3">
            ❤️ {locale === 'cs' ? 'Moje oblíbené' : 'My Favorites'}
          </h1>
          <p className="text-slate-400 max-w-2xl mx-auto text-base md:text-lg">
            {locale === 'cs' 
              ? 'Tvoje uložená místa, regiony a články na jednom přehledném místě.' 
              : 'Your saved countries, regions, and articles in one clear place.'}
          </p>
        </header>

        {/* Tab Controls */}
        <div className="mb-8 flex justify-center border-b border-white/10 pb-px">
          <div className="flex gap-2 p-1 bg-slate-900/60 rounded-full border border-white/5 backdrop-blur">
            <button
              onClick={() => setActiveTab('countries')}
              className={`px-6 py-2.5 rounded-full text-sm font-extrabold transition-all duration-300 ${
                activeTab === 'countries'
                  ? 'bg-emerald-500 text-slate-950 shadow-lg shadow-emerald-500/20'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              {tabLabels.countries} ({countries.length})
            </button>
            <button
              onClick={() => setActiveTab('regions')}
              className={`px-6 py-2.5 rounded-full text-sm font-extrabold transition-all duration-300 ${
                activeTab === 'regions'
                  ? 'bg-emerald-500 text-slate-950 shadow-lg shadow-emerald-500/20'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              {tabLabels.regions} ({regions.length})
            </button>
            <button
              onClick={() => setActiveTab('articles')}
              className={`px-6 py-2.5 rounded-full text-sm font-extrabold transition-all duration-300 ${
                activeTab === 'articles'
                  ? 'bg-emerald-500 text-slate-950 shadow-lg shadow-emerald-500/20'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              {tabLabels.articles} ({articles.length})
            </button>
          </div>
        </div>

        {/* Countries Tab */}
        {activeTab === 'countries' && (
          countries.length === 0 ? (
            <EmptyState tab="countries" locale={locale} />
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {countries.map((country) => (
                <div key={country.id} className="relative group bg-slate-900/40 rounded-3xl overflow-hidden border border-white/10 hover:border-emerald-500/30 shadow-xl hover:shadow-2xl transition-all duration-300 flex flex-col min-h-[380px]">
                  <div className="h-48 relative overflow-hidden bg-slate-950">
                    <SafeImage
                      src={country.image_url ?? '/placeholder.png'}
                      alt={country.name}
                      fill
                      className="object-cover group-hover:scale-105 transition-transform duration-500"
                      fallbackLabel={country.name}
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-950/40 to-transparent pointer-events-none" />
                    <div className="absolute bottom-4 left-4 text-4xl">{country.flag}</div>
                    
                    {/* Un-favorite button */}
                    <button
                      onClick={(e) => handleRemoveFavorite('country', country.id, e)}
                      className="absolute top-4 right-4 h-9 w-9 flex items-center justify-center rounded-full bg-slate-950/80 hover:bg-red-500/20 border border-white/10 text-red-500 hover:text-red-400 hover:border-red-500/30 transition-all duration-200"
                      title={locale === 'cs' ? 'Odebrat z oblíbených' : 'Remove from favorites'}
                    >
                      ❤️
                    </button>
                  </div>
                  <div className="p-6 flex-grow flex flex-col justify-between">
                    <div>
                      <h2 className="text-xl font-black text-white mb-2">{country.name}</h2>
                      <p className="text-slate-400 text-sm line-clamp-3 leading-relaxed">
                        {country.description}
                      </p>
                    </div>
                    <Link href={`/${locale}/country/${country.id}`} className="mt-4 inline-flex items-center gap-1 text-sm font-extrabold text-emerald-400 hover:text-emerald-300 transition-colors">
                      {locale === 'cs' ? 'Otevřít průvodce' : 'Open guide'} &rarr;
                    </Link>
                  </div>
                </div>
              ))}
            </div>
          )
        )}

        {/* Regions Tab */}
        {activeTab === 'regions' && (
          regions.length === 0 ? (
            <EmptyState tab="regions" locale={locale} />
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {regions.map((region) => (
                <div key={region.id} className="relative group bg-slate-900/40 rounded-3xl overflow-hidden border border-white/10 hover:border-emerald-500/30 shadow-xl hover:shadow-2xl transition-all duration-300 flex flex-col min-h-[380px]">
                  <div className="h-48 relative overflow-hidden bg-slate-950">
                    <SafeImage
                      src={region.image_url ?? '/placeholder.png'}
                      alt={region.name}
                      fill
                      className="object-cover group-hover:scale-105 transition-transform duration-500"
                      fallbackLabel={region.name}
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-950/40 to-transparent pointer-events-none" />
                    
                    {/* Un-favorite button */}
                    <button
                      onClick={(e) => handleRemoveFavorite('region', region.id, e)}
                      className="absolute top-4 right-4 h-9 w-9 flex items-center justify-center rounded-full bg-slate-950/80 hover:bg-red-500/20 border border-white/10 text-red-500 hover:text-red-400 hover:border-red-500/30 transition-all duration-200"
                      title={locale === 'cs' ? 'Odebrat z oblíbených' : 'Remove from favorites'}
                    >
                      ❤️
                    </button>
                  </div>
                  <div className="p-6 flex-grow flex flex-col justify-between">
                    <div>
                      <span className="text-[10px] font-extrabold uppercase tracking-widest text-emerald-400">
                        {locale === 'cs' ? 'Region' : 'Region'}
                      </span>
                      <h2 className="text-xl font-black text-white mt-0.5 mb-2">{region.name}</h2>
                      <p className="text-slate-400 text-sm line-clamp-3 leading-relaxed">
                        {region.description}
                      </p>
                    </div>
                    <Link href={`/${locale}/region/${region.id}`} className="mt-4 inline-flex items-center gap-1 text-sm font-extrabold text-emerald-400 hover:text-emerald-300 transition-colors">
                      {locale === 'cs' ? 'Otevřít průvodce' : 'Open guide'} &rarr;
                    </Link>
                  </div>
                </div>
              ))}
            </div>
          )
        )}

        {/* Articles Tab */}
        {activeTab === 'articles' && (
          articles.length === 0 ? (
            <EmptyState tab="articles" locale={locale} />
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {articles.map((article) => (
                <div key={article.slug} className="relative group bg-slate-900/40 rounded-3xl overflow-hidden border border-white/10 hover:border-emerald-500/30 shadow-xl hover:shadow-2xl transition-all duration-300 flex flex-col min-h-[380px]">
                  <div className="h-48 relative overflow-hidden bg-slate-950">
                    <SafeImage
                      src={article.image_url ?? '/placeholder.png'}
                      alt={article.title}
                      fill
                      className="object-cover group-hover:scale-105 transition-transform duration-500"
                      fallbackLabel={article.title}
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-950/40 to-transparent pointer-events-none" />
                    
                    {/* Un-favorite button */}
                    <button
                      onClick={(e) => handleRemoveFavorite('article', article.slug, e)}
                      className="absolute top-4 right-4 h-9 w-9 flex items-center justify-center rounded-full bg-slate-950/80 hover:bg-red-500/20 border border-white/10 text-red-500 hover:text-red-400 hover:border-red-500/30 transition-all duration-200"
                      title={locale === 'cs' ? 'Odebrat z oblíbených' : 'Remove from favorites'}
                    >
                      ❤️
                    </button>
                  </div>
                  <div className="p-6 flex-grow flex flex-col justify-between">
                    <div>
                      <span className="text-[10px] font-extrabold uppercase tracking-widest text-emerald-400">
                        {article.category || (locale === 'cs' ? 'Článek' : 'Article')}
                      </span>
                      <h2 className="text-xl font-black text-white mt-0.5 mb-2 line-clamp-2">{article.title}</h2>
                      {article.excerpt && (
                        <p className="text-slate-400 text-sm line-clamp-2 leading-relaxed">
                          {article.excerpt}
                        </p>
                      )}
                    </div>
                    <Link href={`/${locale}/article/${article.slug}`} className="mt-4 inline-flex items-center gap-1 text-sm font-extrabold text-emerald-400 hover:text-emerald-300 transition-colors">
                      {locale === 'cs' ? 'Číst článek' : 'Read article'} &rarr;
                    </Link>
                  </div>
                </div>
              ))}
            </div>
          )
        )}
      </div>
    </main>
  );
}

function EmptyState({ tab, locale }: { tab: string; locale: string }) {
  const isCs = locale === 'cs';
  const icon = tab === 'countries' ? '🗺️' : tab === 'regions' ? '🏔️' : '✍️';
  const title = isCs 
    ? (tab === 'countries' ? 'Zatím žádné země' : tab === 'regions' ? 'Zatím žádné regiony' : 'Zatím žádné články')
    : (tab === 'countries' ? 'No countries yet' : tab === 'regions' ? 'No regions yet' : 'No articles yet');
    
  const desc = isCs
    ? 'Ulož si zajímavá místa kliknutím na ikonu srdíčka při jejich prohlížení.'
    : 'Save interesting places by clicking the heart icon while browsing.';

  return (
    <div className="bg-slate-900/30 rounded-3xl border border-white/5 p-12 text-center max-w-xl mx-auto shadow-xl backdrop-blur">
      <div className="text-6xl mb-4">{icon}</div>
      <h2 className="text-2xl font-black text-white mb-2">{title}</h2>
      <p className="text-slate-400 mb-8 max-w-sm mx-auto text-sm leading-relaxed">{desc}</p>
      <Link href={`/${locale}`} className="inline-flex rounded-full bg-emerald-500 px-8 py-3 text-sm font-extrabold text-slate-950 hover:bg-emerald-400 transition-colors shadow-lg shadow-emerald-500/20">
        {isCs ? 'Prozkoumat web' : 'Browse website'}
      </Link>
    </div>
  );
}
