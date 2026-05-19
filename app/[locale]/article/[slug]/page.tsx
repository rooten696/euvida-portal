import ArticleHero from '@/app/components/article/ArticleHero';
import AccessSection from '@/app/components/article/AccessSection';
import ArticleComments from '@/app/components/article/ArticleComments';
import PracticalInfoGrid from '@/app/components/article/PracticalInfoGrid';
import PricesSection from '@/app/components/article/PricesSection';
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
    <nav aria-label="Breadcrumb" className="mb-8 text-sm text-slate-500">
      <ol className="flex flex-wrap items-center gap-2">
        <li>
          <Link href={`/${locale}`} className="font-semibold text-blue-800 hover:text-blue-950">
            {getArticleLabel(locale, 'home')}
          </Link>
        </li>
        {country && countryName && (
          <>
            <li aria-hidden="true">/</li>
            <li>
              <Link
                href={`/${locale}/country/${country.id}`}
                className="font-semibold text-blue-800 hover:text-blue-950"
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
                className="font-semibold text-blue-800 hover:text-blue-950"
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
    <p className="mb-6 break-words text-base leading-8 text-slate-800 md:text-lg" {...props} />
  ),
  h1: (props: ComponentPropsWithoutRef<'h1'>) => (
    <h1 className="mb-6 mt-12 break-words text-3xl font-extrabold text-slate-950" {...props} />
  ),
  h2: (props: ComponentPropsWithoutRef<'h2'>) => (
    <h2 className="mb-5 mt-12 break-words text-2xl font-extrabold text-blue-950 md:text-3xl" {...props} />
  ),
  h3: (props: ComponentPropsWithoutRef<'h3'>) => (
    <h3 className="mb-4 mt-8 break-words text-xl font-bold text-slate-950 md:text-2xl" {...props} />
  ),
  strong: (props: ComponentPropsWithoutRef<'strong'>) => (
    <strong className="font-bold text-blue-950" {...props} />
  ),
  ul: (props: ComponentPropsWithoutRef<'ul'>) => (
    <ul className="mb-6 list-disc space-y-2 pl-6 text-base leading-8 text-slate-800 md:text-lg" {...props} />
  ),
  ol: (props: ComponentPropsWithoutRef<'ol'>) => (
    <ol className="mb-6 list-decimal space-y-2 pl-6 text-base leading-8 text-slate-800 md:text-lg" {...props} />
  ),
  li: (props: ComponentPropsWithoutRef<'li'>) => <li className="pl-1" {...props} />,
  a: (props: ComponentPropsWithoutRef<'a'>) => (
    <a className="break-words font-semibold text-blue-800 underline decoration-blue-200 underline-offset-2 hover:text-blue-950 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2" {...props} />
  ),
  blockquote: (props: ComponentPropsWithoutRef<'blockquote'>) => (
    <blockquote className="mb-6 border-l-4 border-yellow-300 pl-5 text-base italic leading-8 text-slate-700 md:text-lg" {...props} />
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
    <main className="min-h-screen bg-slate-50 pb-16 pt-8 font-sans text-slate-950">
      <article className="mx-auto max-w-6xl px-4 md:px-6">
        <Breadcrumb locale={locale} country={country} region={region} />

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
        />

        <div className="mt-8">
          <QuickOverview locale={locale} article={article} />
        </div>

        <div className="mt-10 grid gap-8 lg:grid-cols-[minmax(0,820px)_340px] lg:items-start lg:justify-center">
          <aside className="order-1 lg:order-2">
            <div className="space-y-5 lg:sticky lg:top-24">
              <PracticalInfoGrid locale={locale} practicalInfo={article.practical_info} />
              <PricesSection locale={locale} pricesInfo={article.prices_info} />
              <AccessSection locale={locale} accessInfo={article.access_info} />
            </div>
          </aside>

          <div className="order-2 min-w-0 lg:order-1">
            <section className="max-w-[820px] rounded-2xl border border-slate-200 bg-white p-5 shadow-sm md:p-8">
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
        </div>
      </article>
    </main>
  );
}
