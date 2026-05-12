import { createClient } from '@supabase/supabase-js';
import { notFound } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import ReactMarkdown from 'react-markdown';

// Inicializace Supabase
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const supabase = createClient(supabaseUrl, supabaseKey);

// --- BEZPEČNÉ TYPOVÁNÍ ---
type TranslationData = Record<string, { title?: string; content?: string; excerpt?: string }>;
type LocalizedText = Record<string, string>;

type PracticalInfoLocales = Record<string, Record<string, string>>;

type PriceItem = {
  id: string | number;
  sort_order?: number;
  currency?: string;
  price_type: 'free' | 'from' | 'range' | 'approx' | 'fixed';
  amount?: number;
  amount_min?: number;
  amount_max?: number;
  label?: LocalizedText;
  note?: LocalizedText;
  text?: LocalizedText;
};

type PricesInfo = {
  summary?: LocalizedText;
  notes?: LocalizedText;
  items?: PriceItem[];
};

type AccessItem = {
  id: string | number;
  sort_order?: number;
  label?: LocalizedText;
  description?: LocalizedText;
  note?: LocalizedText;
  price_note?: LocalizedText;
  recommended?: boolean;
  lines?: string[];
  stop_name?: string;
  duration_minutes_min?: number;
  duration_minutes_max?: number;
};

type AccessInfo = {
  summary?: LocalizedText;
  notes?: LocalizedText;
  items?: AccessItem[];
};

type VisitInfo = {
  recommended_time_minutes_min?: number;
  recommended_time_minutes_max?: number;
};

// Nové typování pro zdroje obrázků
type ImageSource = {
  author_name?: string;
  license_name?: string;
};

type SourceInfo = {
  images?: ImageSource[];
};

// Pomocné funkce
const formatDate = (dateString?: string | null, locale = 'cs') => {
  if (!dateString) return null;
  return new Date(dateString).toLocaleDateString(locale === 'cs' ? 'cs-CZ' : locale, {
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });
};

function formatPriceItem(item: PriceItem, locale: string) {
  const currency = item.currency ?? 'EUR';
  const isCs = locale === 'cs';

  if (item.price_type === 'free') return isCs ? 'zdarma' : 'free';
  if (item.price_type === 'from') return `${isCs ? 'od' : 'from'} ${item.amount} ${currency}`;
  if (item.price_type === 'range') return `${item.amount_min}–${item.amount_max} ${currency}`;
  if (item.price_type === 'approx') return `${isCs ? 'cca' : 'approx'} ${item.amount_min ?? item.amount} ${currency}`;
  if (item.price_type === 'fixed') return `${item.amount} ${currency}`;
  
  return null;
}

// 🚀 1. Generování SEO Metadat
export async function generateMetadata({ params }: { params: Promise<{ locale: string; slug: string }> }) {
  const resolvedParams = await params;
  const { locale, slug } = resolvedParams;
  
  const { data: article } = await supabase
    .from('articles')
    .select('title, content, excerpt, image_url, image_alt, translations') // Přidáno image_alt
    .eq('slug', slug)
    .single();

  if (!article) return { title: 'Článek nenalezen | Euvida' };

  const allTranslations = article.translations as TranslationData | null;
  const isDefaultLocale = locale === 'cs';
  const localizedTitle = isDefaultLocale ? article.title : allTranslations?.[locale]?.title || article.title;
  const localizedExcerpt = isDefaultLocale ? article.excerpt : allTranslations?.[locale]?.excerpt || article.excerpt;
  const rawContent = isDefaultLocale ? article.content : allTranslations?.[locale]?.content || article.content;
  
  // Alt text pro OpenGraph obrázek (pokud ho platformy podporují)
  const imageAltData = article.image_alt as LocalizedText | null;
  const imageAlt = imageAltData?.[locale] ?? imageAltData?.cs ?? localizedTitle;
  
  const shortDescription = localizedExcerpt || (rawContent ? rawContent.substring(0, 160) + '...' : 'Přečtěte si článek na Euvida.eu');

  return {
    title: `${localizedTitle} | Euvida`,
    description: shortDescription,
    openGraph: {
      title: localizedTitle,
      description: shortDescription,
      images: [
        { 
          url: article.image_url || '/og-default.jpg',
          alt: imageAlt
        }
      ],
    },
  };
}

// 📖 2. Samotná stránka článku
export default async function ArticlePage({ params }: { params: Promise<{ locale: string; slug: string }> }) {
  const resolvedParams = await params;
  const { locale, slug } = resolvedParams;

  const { data: article, error } = await supabase
    .from('articles')
    .select('*')
    .eq('slug', slug)
    .single();

  if (error || !article || article.published === false) {
    notFound();
  }

  const allTranslations = article.translations as TranslationData | null;
  const isDefaultLocale = locale === 'cs';
  const localizedTitle = isDefaultLocale ? article.title : allTranslations?.[locale]?.title || article.title;
  const localizedContent = isDefaultLocale ? article.content : allTranslations?.[locale]?.content || article.content;
  const localizedExcerpt = isDefaultLocale ? article.excerpt : allTranslations?.[locale]?.excerpt || article.excerpt;

  // Zpracování obrázku (Alt a Zdroj)
  const imageUrl = article.image_url;
  const imageAltData = article.image_alt as LocalizedText | null;
  const imageAlt = imageAltData?.[locale] ?? imageAltData?.cs ?? localizedTitle;
  
  const sourceInfo = article.source_info as SourceInfo | null;
  const firstImageSource = sourceInfo?.images?.[0];

  // Praktické info
  const practicalData = article.practical_info as PracticalInfoLocales | null;
  const practicalTips = practicalData?.[locale] || practicalData?.['cs'];

  // Ceny
  const pricesData = article.prices_info as PricesInfo | null;
  const pricesSummary = pricesData?.summary?.[locale] ?? pricesData?.summary?.cs ?? null;
  const pricesNotes = pricesData?.notes?.[locale] ?? pricesData?.notes?.cs ?? null;
  const pricesItems = [...(pricesData?.items ?? [])].sort((a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0));
  const priceBoxTitle = locale === 'cs' ? 'Vstupné a ceny' : 'Prices & Tickets';

  // Doprava
  const accessData = article.access_info as AccessInfo | null;
  const accessSummary = accessData?.summary?.[locale] ?? accessData?.summary?.cs ?? null;
  const accessNotes = accessData?.notes?.[locale] ?? accessData?.notes?.cs ?? null;
  const accessItems = [...(accessData?.items ?? [])].sort((a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0));
  const accessBoxTitle = locale === 'cs' ? 'Jak se tam dostat' : 'How to get there';

  // Ostatní
  const visitData = article.visit_info as VisitInfo | null;
  const displayUpdatedDate = formatDate(article.last_checked_at || article.updated_at, locale);

  const markdownComponents = {
    p: (props: React.ComponentPropsWithoutRef<'p'>) => <p className="text-gray-800 text-lg leading-relaxed mb-6" {...props} />,
    h2: (props: React.ComponentPropsWithoutRef<'h2'>) => <h2 className="text-3xl font-extrabold text-blue-900 mt-12 mb-6" {...props} />,
    h3: (props: React.ComponentPropsWithoutRef<'h3'>) => <h3 className="text-2xl font-bold text-gray-900 mt-8 mb-4" {...props} />,
    strong: (props: React.ComponentPropsWithoutRef<'strong'>) => <strong className="font-bold text-blue-900" {...props} />,
    ul: (props: React.ComponentPropsWithoutRef<'ul'>) => <ul className="list-disc pl-6 mb-6 text-gray-800 text-lg space-y-2" {...props} />,
    li: (props: React.ComponentPropsWithoutRef<'li'>) => <li {...props} />,
  };

  return (
    <main className="min-h-screen bg-white font-sans pb-24">
      <div className="absolute top-6 left-0 right-0 z-30 px-4">
        <div className="max-w-4xl mx-auto flex items-center justify-between">
          <Link href={`/${locale}`} className="inline-flex items-center gap-2 bg-white/90 backdrop-blur-sm px-5 py-2.5 rounded-full text-blue-900 font-bold hover:bg-white shadow-md hover:shadow-lg transition-all">
            &larr; {locale === 'cs' ? 'Zpět' : 'Back'}
          </Link>
        </div>
      </div>

      <article>
        <header className="relative w-full h-[55vh] min-h-[450px] max-h-[700px] flex flex-col justify-end">
          {imageUrl ? (
            <figure className="absolute inset-0 z-0 m-0 w-full h-full">
              <Image 
                src={imageUrl} 
                alt={imageAlt} 
                fill 
                className="object-cover" 
                priority 
              />
              {/* Tmavý gradient přehozený přes fotku pro lepší čitelnost textů */}
              <div className="absolute inset-0 bg-gradient-to-t from-slate-900 via-slate-900/50 to-transparent" />
              
              {/* Popisek zdroje fotky */}
              {firstImageSource && (
                <figcaption className="absolute bottom-2 right-4 text-[10px] text-white/70 bg-black/40 px-2 py-1 rounded backdrop-blur-sm z-20">
                  {locale === 'cs' ? 'Foto:' : 'Photo:'} {firstImageSource.author_name}
                  {firstImageSource.license_name && `, ${firstImageSource.license_name}`}
                </figcaption>
              )}
            </figure>
          ) : (
            <div className="w-full h-full absolute inset-0 bg-blue-900 z-0" />
          )}
          
          <div className="relative z-10 px-6 pb-12 max-w-4xl mx-auto text-center w-full">
            <div className="flex justify-center gap-3 mb-6 flex-wrap">
              {article.featured && (
                <span className="inline-block bg-red-600 text-white font-extrabold text-xs px-3 py-1.5 rounded-full uppercase tracking-wider shadow-sm">
                  🔥 {locale === 'cs' ? 'Doporučujeme' : 'Featured'}
                </span>
              )}
            </div>
            
            <h1 className="text-4xl md:text-6xl font-black text-white drop-shadow-md tracking-tight leading-tight mb-6">
              {localizedTitle}
            </h1>

            <div className="flex items-center justify-center gap-6 text-gray-200 text-sm font-medium flex-wrap">
              {article.reading_time_minutes && (
                <div className="flex items-center gap-2 bg-white/10 backdrop-blur-md px-4 py-2 rounded-full">
                  <span>⏱️</span> {article.reading_time_minutes} min {locale === 'cs' ? 'čtení' : 'read'}
                </div>
              )}
              {displayUpdatedDate && (
                <div className="flex items-center gap-2 bg-white/10 backdrop-blur-md px-4 py-2 rounded-full">
                  <span>📅</span> {locale === 'cs' ? 'Aktualizováno' : 'Updated'}: {displayUpdatedDate}
                </div>
              )}
            </div>
          </div>
        </header>

        <div className="max-w-4xl mx-auto px-6 mt-12 md:mt-16">
          
          {localizedExcerpt && (
            <div className="text-xl md:text-2xl font-medium text-gray-600 leading-relaxed mb-12 border-l-4 border-yellow-400 pl-6 py-2">
              {localizedExcerpt}
            </div>
          )}

          <div className="prose-lg max-w-none">
            <ReactMarkdown components={markdownComponents}>
              {localizedContent || ''}
            </ReactMarkdown>
          </div>

          {(practicalTips || pricesItems.length > 0 || accessItems.length > 0) && (
            <div className="mt-20 pt-12 border-t-2 border-gray-100">
              <h2 className="text-3xl font-extrabold text-blue-900 mb-8 text-center">
                {locale === 'cs' ? 'Hodí se vědět před cestou' : 'Good to know before you go'}
              </h2>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                
                {/* 1. PRAKTICKÉ INFO */}
                {practicalTips && Object.keys(practicalTips).length > 0 && (
                  <div className="bg-blue-50/50 rounded-2xl p-6 border border-blue-100 shadow-sm md:col-span-2">
                    <h3 className="text-xl font-bold text-blue-900 mb-4 flex items-center gap-2">
                      <span className="text-2xl">💡</span> {locale === 'cs' ? 'Na co si dát pozor' : 'Tips & Tricks'}
                    </h3>
                    <ul className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {Object.entries(practicalTips).map(([key, value]) => (
                        <li key={key} className="text-gray-700 text-sm flex gap-3">
                          <span className="text-blue-500 mt-1">•</span>
                          <span>{value}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {/* 2. CENY VSTUPENEK */}
                {pricesItems.length > 0 && (
                  <div className="bg-green-50/50 rounded-2xl p-6 border border-green-100 shadow-sm flex flex-col">
                    <h3 className="text-lg font-bold text-green-900 mb-2 flex items-center gap-2">
                      <span className="text-2xl">🎟️</span> {priceBoxTitle}
                    </h3>
                    
                    {pricesSummary && <p className="text-sm text-gray-700 mb-4 italic">{pricesSummary}</p>}

                    <ul className="space-y-4 flex-grow">
                      {pricesItems.map((item) => {
                        const label = item.label?.[locale] ?? item.label?.cs ?? item.id;
                        const note = item.note?.[locale] ?? item.note?.cs;
                        const text = item.text?.[locale] ?? item.text?.cs;
                        const price = formatPriceItem(item, locale);

                        return (
                          <li key={item.id} className="border-b border-green-100/60 last:border-0 pb-3 last:pb-0">
                            <div className="flex justify-between items-start gap-4">
                              <strong className="text-sm text-gray-900 font-semibold">{label}</strong>
                              {price && (
                                <span className="text-sm font-bold text-green-900 whitespace-nowrap bg-white/60 px-2 py-0.5 rounded">
                                  {price}
                                </span>
                              )}
                            </div>
                            {text && <p className="text-sm text-gray-600 mt-1">{text}</p>}
                            {note && <small className="block text-xs text-green-800 mt-1 opacity-80">{note}</small>}
                          </li>
                        );
                      })}
                    </ul>

                    {pricesNotes && (
                      <div className="mt-4 pt-4 border-t border-green-200/60">
                        <small className="block text-xs text-gray-500 leading-relaxed">
                          <span className="font-semibold text-gray-600">ⓘ {locale === 'cs' ? 'Poznámka:' : 'Note:'} </span>
                          {pricesNotes}
                        </small>
                      </div>
                    )}
                  </div>
                )}

                {/* 3. DOPRAVA A NÁVŠTĚVA */}
                {accessItems.length > 0 && (
                  <div className="bg-yellow-50/50 rounded-2xl p-6 border border-yellow-100 shadow-sm flex flex-col">
                    <h3 className="text-lg font-bold text-yellow-900 mb-2 flex items-center gap-2">
                      <span className="text-2xl">🚇</span> {accessBoxTitle}
                    </h3>
                    
                    {accessSummary && <p className="text-sm text-gray-700 mb-4 italic">{accessSummary}</p>}

                    <ul className="space-y-4 flex-grow">
                      {accessItems.map((item) => {
                        const label = item.label?.[locale] ?? item.label?.cs ?? item.id;
                        const description = item.description?.[locale] ?? item.description?.cs;
                        const note = item.note?.[locale] ?? item.note?.cs;
                        const priceNote = item.price_note?.[locale] ?? item.price_note?.cs;

                        return (
                          <li key={item.id} className="border-b border-yellow-100/60 last:border-0 pb-3 last:pb-0">
                            <div className="flex justify-between items-start gap-2 mb-1">
                              <strong className="text-sm text-gray-900 font-semibold">{label}</strong>
                              {item.recommended && (
                                <span className="bg-yellow-400 text-yellow-900 text-[10px] uppercase font-bold px-2 py-0.5 rounded shadow-sm whitespace-nowrap">
                                  {locale === 'cs' ? 'Doporučeno' : 'Recommended'}
                                </span>
                              )}
                            </div>

                            {description && <p className="text-sm text-gray-700 mb-2">{description}</p>}

                            {(item.lines?.length || item.stop_name || (item.duration_minutes_min && item.duration_minutes_max)) && (
                              <div className="bg-white/50 rounded p-2 text-sm text-gray-700 space-y-1 mb-2">
                                {item.lines && item.lines.length > 0 && (
                                  <div><span className="font-semibold">{locale === 'cs' ? 'Linky:' : 'Lines:'}</span> {item.lines.join(', ')}</div>
                                )}
                                {item.stop_name && (
                                  <div><span className="font-semibold">{locale === 'cs' ? 'Zastávka:' : 'Stop:'}</span> {item.stop_name}</div>
                                )}
                                {item.duration_minutes_min && item.duration_minutes_max && (
                                  <div>
                                    <span className="font-semibold">{locale === 'cs' ? 'Doba cesty:' : 'Duration:'}</span> {item.duration_minutes_min}–{item.duration_minutes_max} min
                                  </div>
                                )}
                              </div>
                            )}

                            {(priceNote || note) && (
                              <div className="space-y-0.5 mt-1">
                                {priceNote && <small className="block text-xs text-yellow-800"><span className="opacity-70">💰</span> {priceNote}</small>}
                                {note && <small className="block text-xs text-yellow-800"><span className="opacity-70">ⓘ</span> {note}</small>}
                              </div>
                            )}
                          </li>
                        );
                      })}
                    </ul>

                    {visitData && (visitData.recommended_time_minutes_min || visitData.recommended_time_minutes_max) && (
                      <div className="mt-4 pt-4 border-t border-yellow-200/60 text-sm text-gray-700">
                        <span className="font-bold block mb-1">
                          {locale === 'cs' ? 'Doporučený čas prohlídky:' : 'Recommended visit time:'}
                        </span>
                        {visitData.recommended_time_minutes_min} - {visitData.recommended_time_minutes_max} {locale === 'cs' ? 'minut' : 'minutes'}
                      </div>
                    )}

                    {accessNotes && (
                      <div className="mt-4 pt-4 border-t border-yellow-200/60">
                        <small className="block text-xs text-gray-500 leading-relaxed">
                          <span className="font-semibold text-gray-600">ⓘ {locale === 'cs' ? 'Poznámka:' : 'Note:'} </span>
                          {accessNotes}
                        </small>
                      </div>
                    )}
                  </div>
                )}

              </div>
            </div>
          )}

        </div>
      </article>
    </main>
  );
}