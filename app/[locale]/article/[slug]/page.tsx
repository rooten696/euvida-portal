import ArticleAccess from '@/app/components/article/ArticleAccess';
import ArticleHero from '@/app/components/article/ArticleHero';
import ArticlePracticalInfo from '@/app/components/article/ArticlePracticalInfo';
import ArticlePrices from '@/app/components/article/ArticlePrices';
import ArticleQuickInfo from '@/app/components/article/ArticleQuickInfo';
import ArticleSources from '@/app/components/article/ArticleSources';
import {
  categoryLabels,
  getArticleLabel,
  getMappedLabel,
} from '@/lib/articleLabels';
import { formatDate } from '@/lib/articleFormatting';
import {
  getArticleContent,
  getArticleExcerpt,
  getArticleTitle,
  getLocalizedValue,
  getLocationName,
  normalizeLocale,
  stripFirstMarkdownH1,
} from '@/lib/articleLocalization';
import type { Article, LocationRecord, SupportedLocale } from '@/lib/articleTypes';
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

  const title = getArticleTitle(article, locale);
  const excerpt = getArticleExcerpt(article, locale);
  const content = getArticleContent(article, locale);
  const imageAlt = getLocalizedValue(article.image_alt, locale) ?? title;
  const description = excerpt ?? descriptionFromContent(content) ?? 'Přečtěte si článek na Euvida.eu';

  return {
    title: `${title} | Euvida`,
    description,
    openGraph: {
      title,
      description,
      images: article.image_url
        ? [
            {
              url: article.image_url,
              alt: imageAlt,
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
    <p className="mb-6 text-lg leading-relaxed text-slate-800" {...props} />
  ),
  h1: (props: ComponentPropsWithoutRef<'h1'>) => (
    <h1 className="mb-6 mt-12 text-3xl font-extrabold text-slate-950" {...props} />
  ),
  h2: (props: ComponentPropsWithoutRef<'h2'>) => (
    <h2 className="mb-5 mt-12 text-3xl font-extrabold text-blue-950" {...props} />
  ),
  h3: (props: ComponentPropsWithoutRef<'h3'>) => (
    <h3 className="mb-4 mt-8 text-2xl font-bold text-slate-950" {...props} />
  ),
  strong: (props: ComponentPropsWithoutRef<'strong'>) => (
    <strong className="font-bold text-blue-950" {...props} />
  ),
  ul: (props: ComponentPropsWithoutRef<'ul'>) => (
    <ul className="mb-6 list-disc space-y-2 pl-6 text-lg leading-relaxed text-slate-800" {...props} />
  ),
  ol: (props: ComponentPropsWithoutRef<'ol'>) => (
    <ol className="mb-6 list-decimal space-y-2 pl-6 text-lg leading-relaxed text-slate-800" {...props} />
  ),
  li: (props: ComponentPropsWithoutRef<'li'>) => <li className="pl-1" {...props} />,
  a: (props: ComponentPropsWithoutRef<'a'>) => (
    <a className="font-semibold text-blue-800 underline decoration-blue-200 underline-offset-2 hover:text-blue-950" {...props} />
  ),
  blockquote: (props: ComponentPropsWithoutRef<'blockquote'>) => (
    <blockquote className="mb-6 border-l-4 border-yellow-300 pl-5 text-lg italic text-slate-700" {...props} />
  ),
};

export default async function ArticlePage({ params }: PageProps) {
  const { locale: routeLocale, slug } = await params;
  const locale = normalizeLocale(routeLocale);
  const article = await getArticleBySlug(slug);

  if (!article || article.published === false) {
    notFound();
  }

  const { country, region } = await getLocationData(article);
  const title = getArticleTitle(article, locale);
  const excerpt = getArticleExcerpt(article, locale);
  const rawContent = getArticleContent(article, locale);
  const markdownContent = stripFirstMarkdownH1(rawContent);
  const imageAlt = getLocalizedValue(article.image_alt, locale) ?? title;
  const categoryLabel = getMappedLabel(categoryLabels, locale, article.category);
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

        <div className="mt-10 grid gap-8 lg:grid-cols-[minmax(0,1fr)_360px] lg:items-start">
          <div className="space-y-6 lg:hidden">
            <ArticleQuickInfo locale={locale} visitInfo={article.visit_info} />
            <ArticlePracticalInfo locale={locale} practicalInfo={article.practical_info} />
            <ArticlePrices locale={locale} pricesInfo={article.prices_info} />
            <ArticleAccess locale={locale} accessInfo={article.access_info} />
          </div>

          <div className="min-w-0">
            <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm md:p-10">
              <ReactMarkdown components={markdownComponents} skipHtml>
                {markdownContent}
              </ReactMarkdown>
            </section>

            <ArticleSources
              locale={locale}
              sourceInfo={article.source_info}
              lastCheckedAt={article.last_checked_at}
            />
          </div>

          <aside className="hidden lg:block">
            <div className="sticky top-24 space-y-5">
              <ArticleQuickInfo locale={locale} visitInfo={article.visit_info} />
              <ArticlePracticalInfo locale={locale} practicalInfo={article.practical_info} />
              <ArticlePrices locale={locale} pricesInfo={article.prices_info} />
              <ArticleAccess locale={locale} accessInfo={article.access_info} />
            </div>
          </aside>
        </div>
      </article>
    </main>
  );
}
