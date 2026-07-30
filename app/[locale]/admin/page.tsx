'use client';

import Link from 'next/link';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { useLocale } from 'next-intl';
import type { Session } from '@supabase/supabase-js';
import { supabase } from '@/lib/supabaseBrowserClient';
import ImageManager from '@/app/components/admin/ImageManager';
import AdminCommentsPanel from '../../components/admin/AdminCommentsPanel';
import type {
  ImageCredit,
  LocalizedText,
  SourceInfo,
  SupportedLocale,
} from '@/lib/articleTypes';

type ArticleImageData = {
  id: string;
  slug: string;
  title: string;
  category?: string | null;
  image_url?: string | null;
  image_alt?: LocalizedText | null;
  source_info?: SourceInfo | null;
  published?: boolean | null;
  featured?: boolean | null;
  country_id?: string | null;
  created_at?: string | null;
  updated_at?: string | null;
};

type ArticleImageFilter = 'all' | 'missing' | 'has_image' | 'unpublished';
type LocationImageFilter = 'all' | 'missing' | 'has_image';
type ImageAdminTab = 'articles' | 'regions' | 'countries';

type ArticleImageDraft = {
  image_url: string;
  image_alt: LocalizedText;
  source_info: SourceInfo;
};

type RegionImageData = {
  id: string;
  country_id?: string | null;
  name: string;
  language?: string | null;
  image_url?: string | null;
};

type CountryImageData = {
  id: string;
  name: string;
  flag?: string | null;
  image_url?: string | null;
};

function cleanString(value: string | null | undefined): string | null {
  const trimmed = value?.trim();
  return trimmed ? trimmed : null;
}

function cleanLocalizedText(value: LocalizedText | null | undefined): LocalizedText | null {
  const cleaned: LocalizedText = {};

  Object.entries(value ?? {}).forEach(([locale, text]) => {
    const trimmed = text?.trim();

    if (trimmed) {
      cleaned[locale] = trimmed;
    }
  });

  return Object.keys(cleaned).length > 0 ? cleaned : null;
}

function cleanImageCredit(credit: ImageCredit | null | undefined): ImageCredit | null {
  if (!credit) {
    return null;
  }

  const cleaned: ImageCredit = {};

  (Object.entries(credit) as Array<[keyof ImageCredit, string | null | undefined]>).forEach(
    ([key, value]) => {
      const trimmed = value?.trim();

      if (trimmed) {
        cleaned[key] = trimmed;
      }
    }
  );

  return Object.keys(cleaned).length > 0 ? cleaned : null;
}

function withPrimaryImageCredit(
  sourceInfo: SourceInfo | null | undefined,
  credit: ImageCredit
): SourceInfo {
  const existingImages = sourceInfo?.images ?? [];

  return {
    ...(sourceInfo ?? {}),
    images: [credit, ...existingImages.slice(1)],
  };
}

function hasRealArticleImage(article: ArticleImageData): boolean {
  return Boolean(
    article.image_url &&
    !article.image_url.includes('/default_') &&
    !article.image_url.includes('/fallbacks/articles/')
  );
}

function hasRealImageUrl(imageUrl: string | null | undefined): boolean {
  return Boolean(
    imageUrl?.trim() &&
    !imageUrl.includes('/default_') &&
    !imageUrl.includes('/placeholder.png') &&
    !imageUrl.includes('/fallbacks/articles/')
  );
}

function normalizedCategory(category: string | null | undefined): string {
  return category === 'camp' ? 'camping' : category || 'bez kategorie';
}

function createImageDraft(article: ArticleImageData): ArticleImageDraft {
  return {
    image_url: article.image_url ?? '',
    image_alt: article.image_alt ?? {},
    source_info: article.source_info ?? {},
  };
}

export default function AdminPage() {
  const locale = useLocale();
  const [session, setSession] = useState<Session | null>(null);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [authError, setAuthError] = useState('');
  const [articles, setArticles] = useState<ArticleImageData[]>([]);
  const [regions, setRegions] = useState<RegionImageData[]>([]);
  const [countries, setCountries] = useState<CountryImageData[]>([]);
  const [articleDrafts, setArticleDrafts] = useState<Record<string, ArticleImageDraft>>({});
  const [regionImageDrafts, setRegionImageDrafts] = useState<Record<string, string>>({});
  const [savingArticleId, setSavingArticleId] = useState<string | null>(null);
  const [savingRegionId, setSavingRegionId] = useState<string | null>(null);
  const [activeImageTab, setActiveImageTab] = useState<ImageAdminTab>('articles');
  const [articleImageFilter, setArticleImageFilter] = useState<ArticleImageFilter>('all');
  const [regionImageFilter, setRegionImageFilter] = useState<LocationImageFilter>('all');
  const [countryImageFilter, setCountryImageFilter] = useState<LocationImageFilter>('all');
  const [articleImageQuery, setArticleImageQuery] = useState('');
  const [regionImageQuery, setRegionImageQuery] = useState('');
  const [countryImageQuery, setCountryImageQuery] = useState('');
  const [revalidateSlug, setRevalidateSlug] = useState('');
  const [isRevalidating, setIsRevalidating] = useState(false);
  const [status, setStatus] = useState('');

  const fetchArticles = useCallback(async () => {
    const { data } = await supabase
      .from('articles')
      .select('id, slug, title, category, image_url, image_alt, source_info, published, featured, country_id, created_at, updated_at')
      .order('updated_at', { ascending: false, nullsFirst: false })
      .order('created_at', { ascending: false });

    if (data) {
      setArticles(data as ArticleImageData[]);
    }
  }, []);

  const fetchRegions = useCallback(async () => {
    const { data } = await supabase
      .from('regions')
      .select('id, country_id, name, language, image_url')
      .order('country_id', { ascending: true })
      .order('name', { ascending: true });

    if (data) {
      setRegions(data as RegionImageData[]);
    }
  }, []);

  const fetchCountries = useCallback(async () => {
    const { data } = await supabase
      .from('countries')
      .select('id, name, flag, image_url')
      .order('name', { ascending: true });

    if (data) {
      setCountries(data as CountryImageData[]);
    }
  }, []);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => setSession(session));
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => setSession(session));
    fetchArticles();
    fetchRegions();
    fetchCountries();
    return () => subscription.unsubscribe();
  }, [fetchArticles, fetchCountries, fetchRegions]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthError('');
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) setAuthError('Špatný e-mail nebo heslo.');
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
  };

  const getArticleDraft = (article: ArticleImageData): ArticleImageDraft =>
    articleDrafts[article.id] ?? createImageDraft(article);

  const updateArticleDraft = (
    article: ArticleImageData,
    updater: (draft: ArticleImageDraft) => ArticleImageDraft
  ) => {
    setArticleDrafts((current) => ({
      ...current,
      [article.id]: updater(current[article.id] ?? createImageDraft(article)),
    }));
  };

  const updateArticleImageUrl = (article: ArticleImageData, value: string) => {
    updateArticleDraft(article, (draft) => ({ ...draft, image_url: value }));
  };

  const updateArticleAlt = (article: ArticleImageData, locale: SupportedLocale, value: string) => {
    updateArticleDraft(article, (draft) => ({
      ...draft,
      image_alt: {
        ...(draft.image_alt ?? {}),
        [locale]: value,
      },
    }));
  };

  const updateArticleCredit = (article: ArticleImageData, credit: ImageCredit) => {
    updateArticleDraft(article, (draft) => ({
      ...draft,
      source_info: withPrimaryImageCredit(draft.source_info, credit),
    }));
  };

  const getRegionImageDraft = (region: RegionImageData): string =>
    regionImageDrafts[region.id] ?? region.image_url ?? '';

  const updateRegionImageUrl = (region: RegionImageData, value: string) => {
    setRegionImageDrafts((current) => ({
      ...current,
      [region.id]: value,
    }));
  };

  const handleArticleImageSubmit = async (e: React.FormEvent, article: ArticleImageData) => {
    e.preventDefault();

    setStatus('Ukládám obrázek článku...');
    setSavingArticleId(article.id);
    const draft = getArticleDraft(article);

    const primaryCredit = cleanImageCredit(draft.source_info?.images?.[0]);
    const remainingImages = draft.source_info?.images?.slice(1) ?? [];
    const sourceInfoToSave: SourceInfo = {
      ...(draft.source_info ?? {}),
      images: primaryCredit
        ? [primaryCredit, ...remainingImages]
        : remainingImages.length > 0
          ? remainingImages
          : null,
    };

    const { data } = await supabase.auth.getSession();
    const accessToken = data.session?.access_token;

    if (!accessToken) {
      setStatus('Nejsi přihlášený.');
      setSavingArticleId(null);
      return;
    }

    const response = await fetch('/api/admin/article-image', {
      method: 'PATCH',
      headers: {
        authorization: `Bearer ${accessToken}`,
        'content-type': 'application/json',
      },
      body: JSON.stringify({
        id: article.id,
        slug: article.slug,
        image_url: cleanString(draft.image_url),
        image_alt: cleanLocalizedText(draft.image_alt),
        source_info: sourceInfoToSave,
      }),
    });
    const payload = (await response.json().catch(() => null)) as
      | { ok?: boolean; error?: string }
      | null;

    if (!response.ok || !payload?.ok) {
      setStatus('Chyba obrázku článku: ' + (payload?.error ?? `HTTP ${response.status}`));
      setSavingArticleId(null);
      return;
    }

    setStatus('Obrázek článku uložen.');
    setArticleDrafts((current) => {
      const next = { ...current };
      delete next[article.id];
      return next;
    });
    await fetchArticles();
    setSavingArticleId(null);
  };

  const handleRegionImageSubmit = async (e: React.FormEvent, region: RegionImageData) => {
    e.preventDefault();

    setStatus('Ukládám obrázek regionu...');
    setSavingRegionId(region.id);
    const imageUrl = getRegionImageDraft(region);

    const { data } = await supabase.auth.getSession();
    const accessToken = data.session?.access_token;

    if (!accessToken) {
      setStatus('Nejsi přihlášený.');
      setSavingRegionId(null);
      return;
    }

    const response = await fetch('/api/admin/region-image', {
      method: 'PATCH',
      headers: {
        authorization: `Bearer ${accessToken}`,
        'content-type': 'application/json',
      },
      body: JSON.stringify({
        id: region.id,
        image_url: cleanString(imageUrl),
      }),
    });
    const payload = (await response.json().catch(() => null)) as
      | { ok?: boolean; error?: string }
      | null;

    if (!response.ok || !payload?.ok) {
      setStatus('Chyba obrázku regionu: ' + (payload?.error ?? `HTTP ${response.status}`));
      setSavingRegionId(null);
      return;
    }

    setStatus('Obrázek regionu uložen.');
    setRegionImageDrafts((current) => {
      const next = { ...current };
      delete next[region.id];
      return next;
    });
    await fetchRegions();
    setSavingRegionId(null);
  };

  const handleRevalidate = async () => {
    setIsRevalidating(true);
    setStatus('Obnovuji cache webu...');

    try {
      const { data } = await supabase.auth.getSession();
      const accessToken = data.session?.access_token;

      if (!accessToken) {
        throw new Error('Nejsi přihlášený.');
      }

      const response = await fetch('/api/revalidate', {
        method: 'POST',
        headers: {
          authorization: `Bearer ${accessToken}`,
          'content-type': 'application/json',
        },
        body: JSON.stringify({ slug: cleanString(revalidateSlug) }),
      });
      const payload = (await response.json().catch(() => null)) as
        | { ok?: boolean; error?: string }
        | null;

      if (!response.ok || !payload?.ok) {
        throw new Error(payload?.error ?? `HTTP ${response.status}`);
      }

      setStatus(
        revalidateSlug.trim()
          ? `Cache obnovena včetně článku: ${revalidateSlug.trim()}`
          : 'Cache hlavních výpisů obnovena.'
      );
    } catch (error) {
      setStatus(
        `Cache se nepodařilo obnovit: ${
          error instanceof Error ? error.message : 'neznámá chyba'
        }`
      );
    } finally {
      setIsRevalidating(false);
    }
  };

  const articleImageCounts = useMemo(() => ({
    all: articles.length,
    missing: articles.filter((article) => !hasRealArticleImage(article)).length,
    has_image: articles.filter(hasRealArticleImage).length,
    unpublished: articles.filter((article) => !article.published).length,
  }), [articles]);

  const regionImageCounts = useMemo(() => ({
    all: regions.length,
    missing: regions.filter((region) => !hasRealImageUrl(region.image_url)).length,
    has_image: regions.filter((region) => hasRealImageUrl(region.image_url)).length,
  }), [regions]);

  const countryImageCounts = useMemo(() => ({
    all: countries.length,
    missing: countries.filter((country) => !hasRealImageUrl(country.image_url)).length,
    has_image: countries.filter((country) => hasRealImageUrl(country.image_url)).length,
  }), [countries]);

  const filteredArticles = useMemo(() => articles.filter((article) => {
    if (articleImageFilter === 'missing' && hasRealArticleImage(article)) return false;
    if (articleImageFilter === 'has_image' && !hasRealArticleImage(article)) return false;
    if (articleImageFilter === 'unpublished' && article.published) return false;

    const query = articleImageQuery.trim().toLowerCase();
    if (!query) return true;

    return [article.title, article.slug, article.category, article.country_id]
      .filter(Boolean)
      .some((value) => String(value).toLowerCase().includes(query));
  }), [articleImageFilter, articleImageQuery, articles]);

  const filteredRegions = useMemo(() => regions.filter((region) => {
    if (regionImageFilter === 'missing' && hasRealImageUrl(region.image_url)) return false;
    if (regionImageFilter === 'has_image' && !hasRealImageUrl(region.image_url)) return false;

    const query = regionImageQuery.trim().toLowerCase();
    if (!query) return true;

    return [region.name, region.id, region.country_id, region.language]
      .filter(Boolean)
      .some((value) => String(value).toLowerCase().includes(query));
  }), [regionImageFilter, regionImageQuery, regions]);

  const filteredCountries = useMemo(() => countries.filter((country) => {
    if (countryImageFilter === 'missing' && hasRealImageUrl(country.image_url)) return false;
    if (countryImageFilter === 'has_image' && !hasRealImageUrl(country.image_url)) return false;

    const query = countryImageQuery.trim().toLowerCase();
    if (!query) return true;

    return [country.name, country.id]
      .filter(Boolean)
      .some((value) => String(value).toLowerCase().includes(query));
  }), [countries, countryImageFilter, countryImageQuery]);

  const articleImageFilterOptions: { id: ArticleImageFilter; label: string; count: number }[] = [
    { id: 'all', label: 'Vše', count: articleImageCounts.all },
    { id: 'missing', label: 'Bez reálného obrázku', count: articleImageCounts.missing },
    { id: 'has_image', label: 'S obrázkem', count: articleImageCounts.has_image },
    { id: 'unpublished', label: 'Skryté', count: articleImageCounts.unpublished },
  ];

  const regionImageFilterOptions: { id: LocationImageFilter; label: string; count: number }[] = [
    { id: 'all', label: 'Vše', count: regionImageCounts.all },
    { id: 'missing', label: 'Bez obrázku', count: regionImageCounts.missing },
    { id: 'has_image', label: 'S obrázkem', count: regionImageCounts.has_image },
  ];

  const countryImageFilterOptions: { id: LocationImageFilter; label: string; count: number }[] = [
    { id: 'all', label: 'Vše', count: countryImageCounts.all },
    { id: 'missing', label: 'Bez obrázku', count: countryImageCounts.missing },
    { id: 'has_image', label: 'S obrázkem', count: countryImageCounts.has_image },
  ];

  const imageAdminTabs: { id: ImageAdminTab; label: string; count: number }[] = [
    { id: 'articles', label: 'Obrázky článků', count: articleImageCounts.missing },
    { id: 'regions', label: 'Obr. regionů', count: regionImageCounts.missing },
    { id: 'countries', label: 'Obr. zemí', count: countryImageCounts.missing },
  ];

  if (!session) {
    return (
      <main className="min-h-screen bg-slate-950 px-4 py-16 text-slate-100">
        <form onSubmit={handleLogin} className="mx-auto max-w-sm rounded-2xl border border-white/10 bg-slate-900/80 p-8 shadow-2xl">
          <h1 className="mb-6 text-center text-2xl font-black text-white">Přihlášení do administrace</h1>
          <div className="space-y-4">
            <input
              type="email"
              placeholder="E-mail"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className="w-full rounded-xl border border-white/10 bg-slate-950 px-4 py-3 text-sm text-slate-100 outline-none focus:border-emerald-400/70"
            />
            <input
              type="password"
              placeholder="Heslo"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              className="w-full rounded-xl border border-white/10 bg-slate-950 px-4 py-3 text-sm text-slate-100 outline-none focus:border-emerald-400/70"
            />
            {authError && <p className="text-center text-sm text-rose-300">{authError}</p>}
            <button type="submit" className="w-full rounded-xl bg-emerald-500 py-3 font-black text-slate-950 hover:bg-emerald-400">
              Vstoupit
            </button>
          </div>
        </form>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-slate-950 px-4 py-10 text-slate-100">
      <div className="mx-auto max-w-7xl space-y-8">
        <section className="rounded-3xl border border-white/10 bg-slate-950/70 p-6 shadow-2xl md:p-8">
          <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <p className="text-xs font-black uppercase tracking-[0.2em] text-emerald-400">Administrace</p>
              <h1 className="mt-2 text-3xl font-black tracking-tight text-white md:text-4xl">
                Správa obrázků a komentářů
              </h1>
              <p className="mt-2 text-sm font-medium text-slate-400">
                Přihlášen jako: {session.user.email}
              </p>
            </div>

            <div className="flex flex-col gap-3 sm:flex-row">
              <div className="flex rounded-2xl border border-white/10 bg-slate-900 p-1">
                <input
                  type="text"
                  value={revalidateSlug}
                  onChange={(event) => setRevalidateSlug(event.target.value)}
                  placeholder="slug článku volitelně"
                  className="min-w-0 rounded-xl bg-slate-950 px-4 py-2 text-sm text-slate-100 outline-none placeholder:text-slate-600"
                />
                <button
                  type="button"
                  onClick={handleRevalidate}
                  disabled={isRevalidating}
                  className="rounded-xl bg-slate-800 px-4 py-2 text-sm font-black text-white transition hover:bg-slate-700 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {isRevalidating ? 'Obnovuji...' : 'Obnovit cache'}
                </button>
              </div>

              <Link
                href={`/${locale}/admin/data`}
                className="rounded-2xl border border-white/10 bg-slate-900 px-5 py-3 text-center text-sm font-black text-slate-200 transition hover:bg-slate-800"
              >
                Správa obsahu
              </Link>

              <button
                type="button"
                onClick={handleLogout}
                className="rounded-2xl bg-white px-5 py-3 text-sm font-black text-slate-950 transition hover:bg-slate-200"
              >
                Odhlásit se
              </button>
            </div>
          </div>
        </section>

        <AdminCommentsPanel />

        <section className="rounded-3xl border border-white/10 bg-slate-900/60 p-3 shadow-xl shadow-slate-950/20">
          <div className="grid gap-2 md:grid-cols-3">
            {imageAdminTabs.map((tab) => (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveImageTab(tab.id)}
                className={`rounded-2xl px-4 py-3 text-left text-sm font-black transition ${
                  activeImageTab === tab.id
                    ? 'bg-emerald-500 text-slate-950'
                    : 'bg-slate-950 text-slate-300 hover:bg-slate-800'
                }`}
              >
                {tab.label}
                <span className="ml-2 rounded-full bg-black/10 px-2 py-0.5 text-xs">
                  bez obr.: {tab.count}
                </span>
              </button>
            ))}
          </div>
        </section>

        {activeImageTab === 'articles' && (
        <section className="rounded-3xl border border-white/10 bg-slate-950/95 p-6 shadow-xl shadow-slate-950/20 md:p-8">
          <div className="flex flex-col gap-3 border-b border-white/10 pb-5 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 className="text-2xl font-black text-blue-300">Obrázky článků</h2>
              <p className="mt-1 text-sm text-slate-400">
                Náhled, externí URL, upload, alt texty a licence pro detail článku.
              </p>
            </div>
            <button
              type="button"
              onClick={fetchArticles}
              className="rounded-full bg-white px-4 py-2 text-sm font-bold text-blue-800 hover:bg-blue-50"
            >
              Obnovit články
            </button>
          </div>

          <div className="mt-6 flex flex-col gap-3 rounded-xl border border-white/10 bg-slate-900/70 p-4 xl:flex-row xl:items-center xl:justify-between">
            <div className="flex flex-wrap gap-2">
              {articleImageFilterOptions.map((option) => (
                <button
                  key={option.id}
                  type="button"
                  onClick={() => setArticleImageFilter(option.id)}
                  className={`rounded-lg px-3 py-2 text-sm font-bold transition ${
                    articleImageFilter === option.id
                      ? 'bg-emerald-500 text-slate-950'
                      : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
                  }`}
                >
                  {option.label} <span className="opacity-75">({option.count})</span>
                </button>
              ))}
            </div>

            <input
              type="search"
              value={articleImageQuery}
              onChange={(event) => setArticleImageQuery(event.target.value)}
              placeholder="Hledat podle názvu, slug, země nebo kategorie"
              className="w-full rounded-lg border border-white/10 bg-slate-950 px-4 py-2 text-sm text-slate-100 outline-none placeholder:text-slate-600 focus:border-emerald-400/70 focus:ring-2 focus:ring-emerald-500/20 xl:w-96"
            />
          </div>

          <p className="mt-5 text-sm text-slate-500">
            Zobrazeno {filteredArticles.length} z {articles.length}. Články bez URL používají fallback a v DB nemají uložený reálný obrázek.
          </p>

          <div className="mt-6 grid gap-4">
            {filteredArticles.length > 0 ? (
              filteredArticles.map((article) => {
                const draft = getArticleDraft(article);
                const isSaving = savingArticleId === article.id;

                return (
                  <article
                    key={article.id}
                    className="rounded-2xl border border-white/10 bg-slate-900/70 p-4 transition"
                  >
                    <form onSubmit={(event) => handleArticleImageSubmit(event, article)} className="space-y-4">
                      <div className="flex min-w-0 flex-col text-left">
                        <div className="flex flex-wrap items-center gap-2">
                          <h3 className="text-lg font-black text-white">{article.title.trim()}</h3>
                          <span className="rounded-full bg-slate-800 px-2 py-1 text-[11px] font-black uppercase tracking-wide text-slate-300">
                            {normalizedCategory(article.category)}
                          </span>
                          {article.country_id && (
                            <span className="rounded-full bg-blue-500/10 px-2 py-1 text-[11px] font-black uppercase tracking-wide text-blue-300">
                              {article.country_id}
                            </span>
                          )}
                          {!hasRealArticleImage(article) && (
                            <span className="rounded-full bg-amber-500/10 px-2 py-1 text-[11px] font-black uppercase tracking-wide text-amber-200">
                              Bez reálného obrázku
                            </span>
                          )}
                        </div>
                        <p className="mt-2 truncate text-xs font-semibold text-blue-400">
                          /article/{article.slug}
                        </p>
                      </div>

                      <ImageManager
                        title="Hlavní obrázek článku"
                        entityType="articles"
                        entityId={article.slug}
                        imageUrl={draft.image_url}
                        compact
                        altValues={draft.image_alt ?? {}}
                        credit={draft.source_info?.images?.[0] ?? null}
                        onImageUrlChange={(value) => updateArticleImageUrl(article, value)}
                        onAltChange={(locale, value) => updateArticleAlt(article, locale, value)}
                        onCreditChange={(credit) => updateArticleCredit(article, credit)}
                        onStatus={setStatus}
                      />

                      <div className="flex gap-3">
                        <button
                          type="submit"
                          disabled={isSaving}
                          className="flex-grow rounded-xl bg-emerald-500 py-3 font-black text-slate-950 hover:bg-emerald-400 disabled:cursor-not-allowed disabled:opacity-60"
                        >
                          {isSaving ? 'Ukládám...' : 'Uložit URL'}
                        </button>
                        <button
                          type="button"
                          disabled={isSaving}
                          onClick={() =>
                            setArticleDrafts((current) => ({
                              ...current,
                              [article.id]: createImageDraft(article),
                            }))
                          }
                          className="rounded-xl bg-slate-800 px-5 font-bold text-slate-300 hover:bg-slate-700 disabled:cursor-not-allowed disabled:opacity-60"
                        >
                          Vrátit
                        </button>
                      </div>
                    </form>
                  </article>
                );
              })
            ) : (
              <div className="rounded-2xl border border-dashed border-white/10 bg-slate-900 p-8 text-center text-sm font-medium text-slate-500">
                Pro vybraný filtr nejsou žádné články.
              </div>
            )}
          </div>
        </section>
        )}

        {activeImageTab === 'regions' && (
        <section className="rounded-3xl border border-white/10 bg-slate-950/95 p-6 shadow-xl shadow-slate-950/20 md:p-8">
          <div className="flex flex-col gap-3 border-b border-white/10 pb-5 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 className="text-2xl font-black text-blue-300">Obrázky regionů</h2>
              <p className="mt-1 text-sm text-slate-400">
                Samostatná správa hlavních obrázků regionů. Nemíchá se s obrázky článků.
              </p>
            </div>
            <button
              type="button"
              onClick={fetchRegions}
              className="rounded-full bg-white px-4 py-2 text-sm font-bold text-blue-800 hover:bg-blue-50"
            >
              Obnovit regiony
            </button>
          </div>

          <div className="mt-6 flex flex-col gap-3 rounded-xl border border-white/10 bg-slate-900/70 p-4 xl:flex-row xl:items-center xl:justify-between">
            <div className="flex flex-wrap gap-2">
              {regionImageFilterOptions.map((option) => (
                <button
                  key={option.id}
                  type="button"
                  onClick={() => setRegionImageFilter(option.id)}
                  className={`rounded-lg px-3 py-2 text-sm font-bold transition ${
                    regionImageFilter === option.id
                      ? 'bg-emerald-500 text-slate-950'
                      : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
                  }`}
                >
                  {option.label} <span className="opacity-75">({option.count})</span>
                </button>
              ))}
            </div>

            <input
              type="search"
              value={regionImageQuery}
              onChange={(event) => setRegionImageQuery(event.target.value)}
              placeholder="Hledat podle názvu, ID, země nebo jazyka"
              className="w-full rounded-lg border border-white/10 bg-slate-950 px-4 py-2 text-sm text-slate-100 outline-none placeholder:text-slate-600 focus:border-emerald-400/70 focus:ring-2 focus:ring-emerald-500/20 xl:w-96"
            />
          </div>

          <p className="mt-5 text-sm text-slate-500">
            Zobrazeno {filteredRegions.length} z {regions.length}. U regionů se ukládá jen `image_url`.
          </p>

          <div className="mt-6 grid gap-4">
            {filteredRegions.length > 0 ? (
              filteredRegions.map((region) => {
                const draftImageUrl = getRegionImageDraft(region);
                const isSaving = savingRegionId === region.id;

                return (
                  <article
                    key={region.id}
                    className="rounded-2xl border border-white/10 bg-slate-900/70 p-4 transition"
                  >
                    <form onSubmit={(event) => handleRegionImageSubmit(event, region)} className="space-y-4">
                      <div className="flex min-w-0 flex-col text-left">
                        <div className="flex flex-wrap items-center gap-2">
                          <h3 className="text-lg font-black text-white">{region.name.trim()}</h3>
                          {region.country_id && (
                            <span className="rounded-full bg-blue-500/10 px-2 py-1 text-[11px] font-black uppercase tracking-wide text-blue-300">
                              {region.country_id}
                            </span>
                          )}
                          {region.language && (
                            <span className="rounded-full bg-slate-800 px-2 py-1 text-[11px] font-black uppercase tracking-wide text-slate-300">
                              {region.language}
                            </span>
                          )}
                          {!hasRealImageUrl(region.image_url) && (
                            <span className="rounded-full bg-amber-500/10 px-2 py-1 text-[11px] font-black uppercase tracking-wide text-amber-200">
                              Bez obrázku
                            </span>
                          )}
                        </div>
                        <p className="mt-2 truncate text-xs font-semibold text-blue-400">
                          /region/{region.id}
                        </p>
                      </div>

                      <ImageManager
                        title="Hlavní obrázek regionu"
                        entityType="regions"
                        entityId={region.id}
                        imageUrl={draftImageUrl}
                        compact
                        onImageUrlChange={(value) => updateRegionImageUrl(region, value)}
                        onStatus={setStatus}
                      />

                      <div className="flex gap-3">
                        <button
                          type="submit"
                          disabled={isSaving}
                          className="flex-grow rounded-xl bg-emerald-500 py-3 font-black text-slate-950 hover:bg-emerald-400 disabled:cursor-not-allowed disabled:opacity-60"
                        >
                          {isSaving ? 'Ukládám...' : 'Uložit URL regionu'}
                        </button>
                        <button
                          type="button"
                          disabled={isSaving}
                          onClick={() =>
                            setRegionImageDrafts((current) => ({
                              ...current,
                              [region.id]: region.image_url ?? '',
                            }))
                          }
                          className="rounded-xl bg-slate-800 px-5 font-bold text-slate-300 hover:bg-slate-700 disabled:cursor-not-allowed disabled:opacity-60"
                        >
                          Vrátit
                        </button>
                      </div>
                    </form>
                  </article>
                );
              })
            ) : (
              <div className="rounded-2xl border border-dashed border-white/10 bg-slate-900 p-8 text-center text-sm font-medium text-slate-500">
                Pro vybraný filtr nejsou žádné regiony.
              </div>
            )}
          </div>
        </section>
        )}

        {activeImageTab === 'countries' && (
        <section className="rounded-3xl border border-white/10 bg-slate-950/95 p-6 shadow-xl shadow-slate-950/20 md:p-8">
          <div className="flex flex-col gap-3 border-b border-white/10 pb-5 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 className="text-2xl font-black text-blue-300">Obrázky zemí</h2>
              <p className="mt-1 text-sm text-slate-400">
                Zatím jen přehledové okno bez úprav a ukládání.
              </p>
            </div>
            <button
              type="button"
              onClick={fetchCountries}
              className="rounded-full bg-white px-4 py-2 text-sm font-bold text-blue-800 hover:bg-blue-50"
            >
              Obnovit země
            </button>
          </div>

          <div className="mt-6 flex flex-col gap-3 rounded-xl border border-white/10 bg-slate-900/70 p-4 xl:flex-row xl:items-center xl:justify-between">
            <div className="flex flex-wrap gap-2">
              {countryImageFilterOptions.map((option) => (
                <button
                  key={option.id}
                  type="button"
                  onClick={() => setCountryImageFilter(option.id)}
                  className={`rounded-lg px-3 py-2 text-sm font-bold transition ${
                    countryImageFilter === option.id
                      ? 'bg-emerald-500 text-slate-950'
                      : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
                  }`}
                >
                  {option.label} <span className="opacity-75">({option.count})</span>
                </button>
              ))}
            </div>

            <input
              type="search"
              value={countryImageQuery}
              onChange={(event) => setCountryImageQuery(event.target.value)}
              placeholder="Hledat podle názvu nebo ISO kódu"
              className="w-full rounded-lg border border-white/10 bg-slate-950 px-4 py-2 text-sm text-slate-100 outline-none placeholder:text-slate-600 focus:border-emerald-400/70 focus:ring-2 focus:ring-emerald-500/20 xl:w-96"
            />
          </div>

          <p className="mt-5 text-sm text-slate-500">
            Zobrazeno {filteredCountries.length} z {countries.length}. Editace zemí je záměrně vypnutá.
          </p>

          <div className="mt-6 grid gap-4">
            {filteredCountries.length > 0 ? (
              filteredCountries.map((country) => (
                <article
                  key={country.id}
                  className="rounded-2xl border border-white/10 bg-slate-900/70 p-4 transition"
                >
                  <div className="mb-4 flex min-w-0 flex-col text-left">
                    <div className="flex flex-wrap items-center gap-2">
                      <h3 className="text-lg font-black text-white">
                        {country.flag ? `${country.flag} ` : ''}{country.name.trim()}
                      </h3>
                      <span className="rounded-full bg-blue-500/10 px-2 py-1 text-[11px] font-black uppercase tracking-wide text-blue-300">
                        {country.id}
                      </span>
                      {!hasRealImageUrl(country.image_url) && (
                        <span className="rounded-full bg-amber-500/10 px-2 py-1 text-[11px] font-black uppercase tracking-wide text-amber-200">
                          Bez obrázku
                        </span>
                      )}
                    </div>
                    <p className="mt-2 truncate text-xs font-semibold text-blue-400">
                      /country/{country.id}
                    </p>
                  </div>

                  <ImageManager
                    title="Hlavní obrázek země"
                    entityType="countries"
                    entityId={country.id}
                    imageUrl={country.image_url ?? ''}
                    compact
                    disabled
                    onImageUrlChange={() => undefined}
                    onStatus={setStatus}
                  />
                </article>
              ))
            ) : (
              <div className="rounded-2xl border border-dashed border-white/10 bg-slate-900 p-8 text-center text-sm font-medium text-slate-500">
                Pro vybraný filtr nejsou žádné země.
              </div>
            )}
          </div>
        </section>
        )}

        {status && (
          <div className="sticky bottom-4 z-50 rounded-2xl border border-white/10 bg-slate-900 px-5 py-4 text-center text-sm font-black text-slate-100 shadow-2xl">
            {status}
          </div>
        )}
      </div>
    </main>
  );
}
