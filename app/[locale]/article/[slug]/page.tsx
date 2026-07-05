import ArticleHero from '@/app/components/article/ArticleHero';
import AccessSection from '@/app/components/article/AccessSection';
import ArticleComments from '@/app/components/article/ArticleComments';
import PracticalInfoGrid from '@/app/components/article/PracticalInfoGrid';
import PricesSection from '@/app/components/article/PricesSection';
import MobileInfoDrawer from '@/app/components/article/MobileInfoDrawer';
import QuickOverview from '@/app/components/article/QuickOverview';
import SourcesSection from '@/app/components/article/SourcesSection';
import { getArticleLabel } from '@/lib/articleLabels';
import { getCategoryLabel, getLocalizedArticle } from '@/lib/articleDisplay';
import { formatDate } from '@/lib/articleFormatting';
import {
  getLocationName,
  normalizeLocale,
  stripFirstMarkdownH1,
} from '@/lib/articleLocalization';
import {
  supportedLocales,
  type Article,
  type LocationRecord,
  type SupportedLocale,
} from '@/lib/articleTypes';
import { createClient } from '@supabase/supabase-js';
import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import type { ComponentPropsWithoutRef } from 'react';
import { cache } from 'react';
import ReactMarkdown from 'react-markdown';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const supabase = createClient(supabaseUrl, supabaseKey);
const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://euvida.eu';

type PageProps = {
  params: Promise<{ locale: string; slug: string }>;
};

const getArticleBySlug = cache(async (slug: string) => {
  const { data, error } = await supabase
    .from('articles')
    .select('*')
    .eq('slug', slug)
    .single();

  if (error || !data) {
    return null;
  }

  return data as Article;
});

async function getLocationData(article: Article) {
  const [countryResult, regionResult] = await Promise.all([
    article.country_id
      ? supabase
          .from('countries')
          .select('id, name, translations')
          .eq('id', article.country_id)
          .maybeSingle()
      : Promise.resolve({ data: null }),
    article.region_id
      ? supabase
          .from('regions')
          .select('id, name, country_id, translations')
          .eq('id', article.region_id)
          .maybeSingle()
      : Promise.resolve({ data: null }),
  ]);

  return {
    country: countryResult.data as LocationRecord | null,
    region: regionResult.data as LocationRecord | null,
  };
}

function descriptionFromContent(content: string): string | null {
  const description = content
    .replace(/^#(?!#)\s+.*$/m, '')
    .replace(/[#>*_`~\[\]()]/g, '')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, 160);

  return description.length > 0 ? description : null;
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { locale: routeLocale, slug } = await params;
  const locale = normalizeLocale(routeLocale);
  const article = await getArticleBySlug(slug);

  if (!article || article.published === false) {
    return { title: 'Článek nenalezen | Euvida' };
  }

  const localizedArticle = getLocalizedArticle(article, locale);
  const description =
    localizedArticle.excerpt ??
    descriptionFromContent(localizedArticle.content) ??
    'Přečtěte si článek na Euvida.eu';

  return {
    metadataBase: new URL(siteUrl),
    title: `${localizedArticle.title} | Euvida`,
    description,
    alternates: {
      canonical: `/${locale}/article/${slug}`,
      languages: Object.fromEntries(
        supportedLocales.map((supportedLocale) => [
          supportedLocale,
          `/${supportedLocale}/article/${slug}`,
        ])
      ),
    },
    openGraph: {
      title: localizedArticle.title,
      description,
      type: 'article',
      url: `/${locale}/article/${slug}`,
      images: article.image_url
        ? [
            {
              url: article.image_url,
              alt: localizedArticle.imageAlt,
            },
          ]
        : undefined,
    },
  };
}

function Breadcrumb({
  locale,
  country,
  region,
}: {
  locale: SupportedLocale;
  country: LocationRecord | null;
  region: LocationRecord | null;
}) {
  const countryName = getLocationName(country, locale);
  const regionName = getLocationName(region, locale);

  return (
    <nav aria-label="Breadcrumb" className="mb-8 text-sm text-slate-400">
      <ol className="flex flex-wrap items-center gap-2">
        <li>
          <Link href={`/${locale}`} className="font-semibold text-emerald-400 hover:text-emerald-300">
            {getArticleLabel(locale, 'home')}
          </Link>
        </li>
        {country && countryName && (
          <>
            <li aria-hidden="true">/</li>
            <li>
              <Link
                href={`/${locale}/country/${country.id}`}
                className="font-semibold text-emerald-400 hover:text-emerald-300"
              >
                {countryName}
              </Link>
            </li>
          </>
        )}
        {region && regionName && (
          <>
            <li aria-hidden="true">/</li>
            <li>
              <Link
                href={`/${locale}/region/${region.id}`}
                className="font-semibold text-emerald-400 hover:text-emerald-300"
              >
                {regionName}
              </Link>
            </li>
          </>
        )}
      </ol>
    </nav>
  );
}

const markdownComponents = {
  p: (props: ComponentPropsWithoutRef<'p'>) => (
    <p className="mb-6 break-words text-base leading-8 text-slate-300 md:text-lg" {...props} />
  ),
  h1: (props: ComponentPropsWithoutRef<'h1'>) => (
    <h1 className="mb-6 mt-12 break-words text-3xl font-extrabold text-white" {...props} />
  ),
  h2: (props: ComponentPropsWithoutRef<'h2'>) => (
    <h2 className="mb-5 mt-12 break-words text-2xl font-extrabold text-white md:text-3xl" {...props} />
  ),
  h3: (props: ComponentPropsWithoutRef<'h3'>) => (
    <h3 className="mb-4 mt-8 break-words text-xl font-bold text-white md:text-2xl" {...props} />
  ),
  strong: (props: ComponentPropsWithoutRef<'strong'>) => (
    <strong className="font-bold text-white" {...props} />
  ),
  ul: (props: ComponentPropsWithoutRef<'ul'>) => (
    <ul className="mb-6 list-disc space-y-2 pl-6 text-base leading-8 text-slate-300 md:text-lg" {...props} />
  ),
  ol: (props: ComponentPropsWithoutRef<'ol'>) => (
    <ol className="mb-6 list-decimal space-y-2 pl-6 text-base leading-8 text-slate-300 md:text-lg" {...props} />
  ),
  li: (props: ComponentPropsWithoutRef<'li'>) => <li className="pl-1" {...props} />,
  a: (props: ComponentPropsWithoutRef<'a'>) => (
    <a className="break-words font-semibold text-emerald-400 underline decoration-emerald-500/50 underline-offset-2 hover:text-emerald-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 focus-visible:ring-offset-2" {...props} />
  ),
  blockquote: (props: ComponentPropsWithoutRef<'blockquote'>) => (
    <blockquote className="mb-6 border-l-4 border-emerald-500/50 pl-5 text-base italic leading-8 text-slate-400 md:text-lg" {...props} />
  ),
};

function normalizeMarkdownTitle(value: string): string {
  return value
    .replace(/[#*_`~[\]()]/g, '')
    .replace(/[^\w\s\u00C0-\u024F&+]/g, '')
    .replace(/\s+/g, ' ')
    .trim()
    .toLocaleLowerCase('cs-CZ');
}

function stripStructuredArticleSections(markdown: string, locale: SupportedLocale): string {
  const sectionTitles = new Set(
    [
      getArticleLabel(locale, 'quickInfo'),
      getArticleLabel(locale, 'practicalInfo'),
      getArticleLabel(locale, 'prices'),
      getArticleLabel(locale, 'access'),
      getArticleLabel(locale, 'sources'),
      getArticleLabel('cs', 'quickInfo'),
      getArticleLabel('cs', 'practicalInfo'),
      getArticleLabel('cs', 'prices'),
      getArticleLabel('cs', 'access'),
      getArticleLabel('cs', 'sources'),
      'Quick overview',
      'Practical information',
      'Prices and tickets',
      'How to get there',
      'Sources and verification',
      'Zdroje',
      'Použité zdroje',
      'Zdroje a ověření informací',
      'Hlavní traily',
      'Main trails',
      'Bezpečnost',
      'Safety',
    ].map(normalizeMarkdownTitle)
  );
  const lines = markdown.split(/\r?\n/);
  const result: string[] = [];
  let skippedHeadingLevel: number | null = null;

  for (const line of lines) {
    const heading = /^(#{2,6})\s+(.+?)\s*#*\s*$/.exec(line.trim());

    if (heading) {
      const headingLevel = heading[1].length;

      if (skippedHeadingLevel !== null && headingLevel <= skippedHeadingLevel) {
        skippedHeadingLevel = null;
      }

      if (sectionTitles.has(normalizeMarkdownTitle(heading[2]))) {
        skippedHeadingLevel = headingLevel;
        continue;
      }
    }

    if (skippedHeadingLevel !== null) {
      continue;
    }

    result.push(line);
  }

  return result.join('\n').trim();
}

export default async function ArticlePage({ params }: PageProps) {
  const { locale: routeLocale, slug } = await params;
  const locale = normalizeLocale(routeLocale);
  const article = await getArticleBySlug(slug);

  if (!article || article.published === false) {
    notFound();
  }

  const { country, region } = await getLocationData(article);
  const localizedArticle = getLocalizedArticle(article, locale);
  const { title, excerpt, content: rawContent, imageAlt } = localizedArticle;
  const markdownContent = stripStructuredArticleSections(stripFirstMarkdownH1(rawContent), locale);
  const categoryLabel = getCategoryLabel(article.category, locale);
  const checkedDate = formatDate(article.last_checked_at ?? article.source_info?.last_checked, locale);
  const updatedDate = formatDate(article.updated_at ?? article.created_at, locale);
  const countryName = getLocationName(country, locale);
  const regionName = getLocationName(region, locale);
  const weatherLocation = (article.access_info as any)?.[locale]?.address || (article.access_info as any)?.cs?.address || regionName || countryName;

  // Merge booking_url from practical_info into prices_info
  const dbPricesInfo = article.prices_info || {};
  const dbPracticalInfo = article.practical_info || {};
  const dbBookingUrl = (dbPricesInfo as any)?.booking_url || (dbPracticalInfo as any)?.[locale]?.booking_url || (dbPracticalInfo as any)?.cs?.booking_url;

  const pricesInfo = article.prices_info || dbBookingUrl
    ? {
        ...article.prices_info,
        booking_url: dbBookingUrl
      }
    : null;

  const metaItems = [
    article.reading_time_minutes
      ? {
          label: getArticleLabel(locale, 'readingTime'),
          value: `${article.reading_time_minutes} ${getArticleLabel(locale, 'readingTimeUnit')}`,
        }
      : null,
    checkedDate
      ? {
          label: getArticleLabel(locale, 'checked'),
          value: checkedDate,
        }
      : updatedDate
        ? {
            label: getArticleLabel(locale, 'updated'),
            value: updatedDate,
          }
        : null,
    countryName
      ? {
          label: getArticleLabel(locale, 'country'),
          value: countryName,
        }
      : null,
    regionName
      ? {
          label: getArticleLabel(locale, 'region'),
          value: regionName,
        }
      : null,
  ].filter((item): item is { label: string; value: string } => Boolean(item));

  return (
    <main className="min-h-screen bg-slate-950 pb-16 pt-8 font-sans text-slate-100">
      <article className="mx-auto max-w-[1360px] px-4 md:px-6">
        <ArticleHero
          locale={locale}
          title={title}
          excerpt={excerpt}
          categoryLabel={categoryLabel}
          featured={article.featured}
          metaItems={metaItems}
          imageUrl={article.image_url}
          imageAlt={imageAlt}
          imageCredit={article.image_url ? article.source_info?.images?.[0] : null}
          breadcrumb={<Breadcrumb locale={locale} country={country} region={region} />}
          weatherLocation={weatherLocation}
          regionName={regionName}
          countryName={countryName}
        />

        {/* <div className="mt-8">
          <QuickOverview locale={locale} article={article} />
        </div> */}

        <div className="mt-10 grid gap-6 lg:grid-cols-[250px_minmax(0,1fr)_300px] lg:items-start">
          {/* Left Column - Practical Info */}
          <aside className="hidden lg:block order-2 lg:order-1">
            <div className="space-y-5 lg:sticky lg:top-24">
              <PracticalInfoGrid locale={locale} practicalInfo={article.practical_info} />
            </div>
          </aside>

          {/* Middle Column - Article Content */}
          <div className="order-1 min-w-0 lg:order-2 space-y-8">
            <section className="rounded-2xl border border-white/10 bg-slate-900/60 p-5 shadow-xl backdrop-blur md:p-8">
              <ReactMarkdown components={markdownComponents} skipHtml>
                {markdownContent}
              </ReactMarkdown>
            </section>

            <SourcesSection
              locale={locale}
              sourceInfo={article.source_info}
              lastCheckedAt={article.last_checked_at}
            />

            <ArticleComments articleSlug={slug} locale={locale} />
          </div>

          {/* Right Column - Prices & Access */}
          <aside className="hidden lg:block order-3 lg:order-3">
            <div className="space-y-5 lg:sticky lg:top-24">
              <PricesSection locale={locale} pricesInfo={pricesInfo} />
              <AccessSection locale={locale} accessInfo={article.access_info} />
            </div>
          </aside>
        </div>

        <MobileInfoDrawer
          locale={locale}
          practicalInfo={article.practical_info}
          pricesInfo={pricesInfo}
          accessInfo={article.access_info}
        />
      </article>
    </main>
  );
}
