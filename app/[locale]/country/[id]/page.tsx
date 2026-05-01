import { createClient } from '@supabase/supabase-js';
import { notFound } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image'; // PŘIDÁNO: Import pro SVG vlajky
import ReactMarkdown from 'react-markdown';
import FavoriteButton from '@/app/components/FavoriteButton';
import { getTranslations } from 'next-intl/server';
import LanguageSwitcher from '@/app/components/LanguageSwitcher';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

type Region = {
  id: string;
  name: string;
  language: string;
  description: string;
  image_url: string;
  translations?: Record<string, Record<string, string>>;
};

type TranslationData = Record<string, Record<string, string>>;

export async function generateMetadata({ params }: { params: Promise<{ locale: string; id: string }> }) {
  const resolvedParams = await params;
  const { locale, id } = resolvedParams;

  const { data: country } = await supabase
    .from('countries')
    .select('name, description, image_url, translations')
    .eq('id', id)
    .single();

  if (!country) return { title: 'Země nenalezena | Euvida' };

  const allTranslations = country.translations as TranslationData | null;
  const translation = allTranslations?.[locale];
  const displayName = translation?.name || country.name;
  const displayDescription = translation?.description || country.description;

  return {
    title: `${displayName} | Euvida`,
    description: displayDescription,
    openGraph: {
      title: `${displayName}: Vše o životě a cestování`,
      description: displayDescription,
      images: [{ url: country.image_url || '/og-default.jpg' }],
    },
  };
}

export default async function CountryPage({ params }: { params: Promise<{ locale: string; id: string }> }) {
  const resolvedParams = await params;
  const { locale, id } = resolvedParams;

  const t = await getTranslations('CountryDetail');

  const { data: country } = await supabase
    .from('countries')
    .select('*')
    .eq('id', id)
    .single();

  if (!country) notFound();

  const allTranslations = country.translations as TranslationData | null;
  const translation = allTranslations?.[locale];

  const displayData = {
    ...country,
    name: translation?.name || country.name,
    description: translation?.description || country.description,
    general_info: translation?.general_info || country.general_info,
    travel_tourism: translation?.travel_tourism || country.travel_tourism,
    life_work: translation?.life_work || country.life_work,
    culture_food: translation?.culture_food || country.culture_food,
    practical_cautions: translation?.practical_cautions || country.practical_cautions,
  };

  const { data: regions } = await supabase
    .from('regions')
    .select('*')
    .eq('country_id', id)
    .order('name');

  const markdownComponents = {
    p: (props: React.ComponentPropsWithoutRef<'p'>) => <p className="text-gray-700 leading-relaxed mb-4" {...props} />,
    strong: (props: React.ComponentPropsWithoutRef<'strong'>) => <strong className="font-bold text-blue-900" {...props} />,
    ul: (props: React.ComponentPropsWithoutRef<'ul'>) => <ul className="list-disc pl-5 mb-4 text-gray-700 space-y-1" {...props} />,
    li: (props: React.ComponentPropsWithoutRef<'li'>) => <li {...props} />
  };

  const regionMarkdownComponents = {
    p: (props: React.ComponentPropsWithoutRef<'p'>) => <p className="text-gray-600 text-sm leading-relaxed mb-3 line-clamp-3" {...props} />,
    strong: (props: React.ComponentPropsWithoutRef<'strong'>) => <strong className="font-bold text-gray-900" {...props} />,
    ul: (props: React.ComponentPropsWithoutRef<'ul'>) => <ul className="list-disc pl-4 mb-3 text-gray-600 text-sm space-y-1" {...props} />,
    li: (props: React.ComponentPropsWithoutRef<'li'>) => <li {...props} />
  };

  return (
    <main className="min-h-screen bg-gray-50 text-gray-900 font-sans">
      
      {/* OPRAVENÁ HORNÍ NAVIGACE (Tlačítko zpět + Přepínač jazyků) */}
      <div className="absolute top-6 left-0 right-0 z-30 px-4">
        <div className="max-w-5xl mx-auto flex items-center justify-between">
          <Link href={`/${locale}`} className="inline-flex items-center gap-2 bg-white/90 backdrop-blur-sm px-4 py-2 rounded-full text-blue-900 font-bold hover:bg-white shadow-sm transition-colors">
            &larr; {t('back_button')}
          </Link>
          
          <LanguageSwitcher currentLocale={locale} />
        </div>
      </div>

      <header className="relative py-32 px-4 text-center overflow-hidden border-b-4 border-yellow-400 min-h-[50vh] flex flex-col justify-center">
        {displayData.image_url ? (
          <div className="absolute inset-0 z-0 bg-cover bg-center" style={{ backgroundImage: `url('${displayData.image_url}')` }} />
        ) : (
          <div className="absolute inset-0 z-0 bg-blue-900" />
        )}
        <div className="absolute inset-0 bg-slate-900/60 z-10" />

        <div className="relative z-20">
          {/* ZDE JE OPRAVA: Kombo pro zobrazení vlajky */}
          <div className="flex justify-center mb-6">
            {/* MOBIL: Emoji vlajka */}
            <span className="md:hidden text-7xl drop-shadow-md">
              {displayData.flag}
            </span>

            {/* DESKTOP: SVG vlajka */}
            <div className="hidden md:block">
              <Image 
                src={`/flags/${displayData.id.toLowerCase()}.svg`} 
                alt={displayData.name} 
                width={96} 
                height={64} 
                className="rounded-xl border-4 border-white/20 object-cover shadow-2xl w-24 h-16"
              />
            </div>
          </div>
          
          <h1 className="text-6xl font-extrabold mb-4 text-white drop-shadow-lg tracking-tight">{displayData.name}</h1>
          <p className="text-xl text-gray-100 max-w-2xl mx-auto drop-shadow-md font-medium leading-relaxed mb-8">{displayData.description}</p>
          
          <div className="flex justify-center">
            <FavoriteButton countryId={displayData.id} />
          </div>
        </div>
      </header>

      <section className="max-w-5xl mx-auto py-12 px-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-16">
          {displayData.general_info && (
            <div className="bg-white rounded-2xl shadow-sm p-8 border border-gray-100">
              <h2 className="text-2xl font-bold mb-4 text-blue-900 flex items-center gap-2"><span>📍</span> {t('general_info')}</h2>
              <ReactMarkdown components={markdownComponents}>{displayData.general_info}</ReactMarkdown>
            </div>
          )}
          {displayData.travel_tourism && (
            <div className="bg-white rounded-2xl shadow-sm p-8 border border-gray-100">
              <h2 className="text-2xl font-bold mb-4 text-blue-900 flex items-center gap-2"><span>✈️</span> {t('travel_tourism')}</h2>
              <ReactMarkdown components={markdownComponents}>{displayData.travel_tourism}</ReactMarkdown>
            </div>
          )}
          {displayData.life_work && (
            <div className="bg-white rounded-2xl shadow-sm p-8 border border-gray-100">
              <h2 className="text-2xl font-bold mb-4 text-blue-900 flex items-center gap-2"><span>💼</span> {t('life_work')}</h2>
              <ReactMarkdown components={markdownComponents}>{displayData.life_work}</ReactMarkdown>
            </div>
          )}
          {displayData.culture_food && (
            <div className="bg-white rounded-2xl shadow-sm p-8 border border-gray-100">
              <h2 className="text-2xl font-bold mb-4 text-blue-900 flex items-center gap-2"><span>🍷</span> {t('culture_food')}</h2>
              <ReactMarkdown components={markdownComponents}>{displayData.culture_food}</ReactMarkdown>
            </div>
          )}
          {displayData.practical_cautions && (
            <div className="bg-orange-50/50 rounded-2xl shadow-sm p-8 border border-orange-100 md:col-span-2">
              <h2 className="text-2xl font-bold mb-4 text-orange-900 flex items-center gap-2">
                <span>⚠️</span> {t('practical_cautions')}
              </h2>
              <ReactMarkdown components={markdownComponents}>
                {displayData.practical_cautions}
              </ReactMarkdown>
            </div>
          )}
        </div>

        {regions && regions.length > 0 && (
          <div className="mt-20">
            <h2 className="text-3xl font-extrabold text-blue-900 mb-8 flex items-center gap-3">
              <span className="text-yellow-500">🗺️</span> {t('regions_title')}
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              {regions.map((region: Region) => {
                
                const regionTranslations = region.translations as TranslationData | null;
                const rLang = regionTranslations?.[locale];
                
                const rName = rLang?.name || region.name;
                const rDesc = rLang?.description || region.description;

                return (
                  <Link href={`/${locale}/region/${region.id}`} key={region.id} className="bg-white rounded-3xl overflow-hidden shadow-sm border border-gray-100 group hover:shadow-xl hover:-translate-y-1 transition-all flex flex-col cursor-pointer">
                    {region.image_url && (
                      <div className="h-48 overflow-hidden shrink-0">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img 
                          src={region.image_url} 
                          alt={rName} 
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" 
                        />
                      </div>
                    )}
                    <div className="p-6 flex-grow flex flex-col">
                      <div className="flex justify-between items-start mb-4">
                        <h3 className="text-xl font-bold text-gray-900 group-hover:text-blue-600 transition-colors">{rName}</h3>
                        {region.language && (
                          <span className="text-xs font-bold bg-blue-50 text-blue-600 px-2 py-1 rounded-md uppercase shrink-0 ml-2">
                            {region.language}
                          </span>
                        )}
                      </div>
                      <div className="flex-grow">
                        <ReactMarkdown components={regionMarkdownComponents}>
                          {rDesc}
                        </ReactMarkdown>
                      </div>
                      <div className="mt-4 text-sm font-bold text-blue-600 group-hover:text-blue-800 flex items-center gap-1">
                        {t('explore_region')} <span className="text-lg">&rarr;</span>
                      </div>
                    </div>
                  </Link>
                );
              })}
            </div>
          </div>
        )}
      </section>
    </main>
  );
}