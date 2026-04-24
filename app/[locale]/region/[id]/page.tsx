import { createClient } from '@supabase/supabase-js';
import { notFound } from 'next/navigation';
import Link from 'next/link';
import ReactMarkdown from 'react-markdown';
import { getTranslations } from 'next-intl/server';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

type TranslationData = Record<string, Record<string, string>>;

export async function generateMetadata({ params }: { params: Promise<{ locale: string; id: string }> }) {
  const resolvedParams = await params;
  const { locale, id } = resolvedParams;

  const { data: region } = await supabase
    .from('regions')
    .select('name, description, image_url, translations')
    .eq('id', id)
    .single();

  if (!region) return { title: 'Region nenalezen | Euvida' };

  const allTranslations = region.translations as TranslationData | null;
  const rLang = allTranslations?.[locale];
  const displayName = rLang?.name || region.name;

  return { title: `${displayName} | Euvida` };
}

// Pomocná funkce pro filtraci teploty
const hasTemp = (temp?: string) => temp && temp.trim() !== '' && temp !== 'N/A';

export default async function RegionPage({ params }: { params: Promise<{ locale: string; id: string }> }) {
  const resolvedParams = await params;
  const { locale, id } = resolvedParams;

  const t = await getTranslations('RegionDetail');

  const { data: region } = await supabase.from('regions').select('*').eq('id', id).single();
  if (!region) notFound();

  const allTranslations = region.translations as TranslationData | null;
  const rLang = allTranslations?.[locale];

  const displayData = {
    ...region,
    name: rLang?.name || region.name,
    description: rLang?.description || region.description,
    general_info: rLang?.general_info || region.general_info,
    nature_and_landscapes: rLang?.nature_and_landscapes || region.nature_and_landscapes,
    history_and_culture: rLang?.history_and_culture || region.history_and_culture,
    transport_and_life: rLang?.transport_and_life || region.transport_and_life,
  };

  // --- POČASÍ API ---
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let weatherData: any = null;
  const weatherApiKey = process.env.NEXT_PUBLIC_WEATHER_API_KEY; 

  if (weatherApiKey) {
    try {
      const weatherRes = await fetch(
        `https://api.openweathermap.org/data/2.5/weather?q=${displayData.name}&appid=${weatherApiKey}&units=metric&lang=${locale}`,
        { next: { revalidate: 1800 } } // Aktualizace každou půlhodinu
      );
      
      if (weatherRes.ok) {
        weatherData = await weatherRes.json();
      }
    } catch (e) {
      console.error("Chyba při stahování počasí:", e);
    }
  }

  // Přísně typované komponenty bez použití 'any'
  const markdownComponents = {
    p: (props: React.ComponentPropsWithoutRef<'p'>) => <p className="text-gray-700 leading-relaxed mb-4" {...props} />,
    strong: (props: React.ComponentPropsWithoutRef<'strong'>) => <strong className="font-bold text-blue-900" {...props} />,
    ul: (props: React.ComponentPropsWithoutRef<'ul'>) => <ul className="list-disc pl-5 mb-4 text-gray-700 space-y-1" {...props} />,
    li: (props: React.ComponentPropsWithoutRef<'li'>) => <li {...props} />
  };

  return (
    <main className="min-h-screen bg-gray-50 text-gray-900 font-sans pb-20">
      
      <div className="absolute top-6 left-4 md:left-auto md:max-w-5xl md:mx-auto w-full z-30 px-4">
        <Link href={`/${locale}/country/${region.country_id}`} className="inline-flex items-center gap-2 bg-white/90 backdrop-blur-sm px-4 py-2 rounded-full text-blue-900 font-bold hover:bg-white shadow-sm transition-colors">
          &larr; {t('back_button')}
        </Link>
      </div>

      <header className="relative py-32 px-4 text-center overflow-hidden border-b-4 border-yellow-400 min-h-[40vh] flex flex-col justify-center">
        {displayData.image_url && (
          <div className="absolute inset-0 z-0 bg-cover bg-center" style={{ backgroundImage: `url('${displayData.image_url}')` }} />
        )}
        <div className="absolute inset-0 bg-slate-900/60 z-10" />
        <div className="relative z-20 max-w-4xl mx-auto">
          <h1 className="text-5xl md:text-7xl font-extrabold mb-4 text-white drop-shadow-lg tracking-tight">{displayData.name}</h1>
          <p className="text-xl text-gray-100 drop-shadow-md font-medium leading-relaxed">{displayData.description}</p>
        </div>
      </header>

      <section className="max-w-5xl mx-auto py-12 px-4">
        
        <div className="bg-white rounded-3xl shadow-sm border border-gray-100 p-8 mb-12">
          <h2 className="text-2xl font-bold mb-6 text-blue-900 flex items-center gap-2">
            <span>🌡️</span> {t('temp_title')} & {t('weather_title')}
          </h2>
          
          <div className="grid grid-cols-1 lg:grid-cols-5 gap-8">
            
            {/* Sekce počasí (zobrazí se jen když máme data z API) */}
            {weatherData && (
              <div className="lg:col-span-1 flex flex-col justify-center">
                <div className="bg-blue-50/50 rounded-2xl p-4 flex flex-col items-center justify-center text-center border border-blue-100 h-full">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={`https://openweathermap.org/img/wn/${weatherData.weather[0].icon}@2x.png`} alt="Ikona počasí" className="w-20 h-20 -mb-2" />
                  <div className="text-4xl font-extrabold text-blue-900 mb-1">{Math.round(weatherData.main.temp)}°C</div>
                  <div className="text-sm font-bold text-blue-600 capitalize">{weatherData.weather[0].description}</div>
                </div>
              </div>
            )}

            {/* Průměrné teploty - Roztáhnou se na celou šířku, pokud počasí není */}
            <div className={`${weatherData ? 'lg:col-span-4' : 'lg:col-span-5'} grid grid-cols-2 md:grid-cols-4 gap-4`}>
              {[
                { label: t('spring'), icon: '🌸', air: displayData.temp_spring_air, sea: displayData.temp_spring_sea, bg: 'bg-gray-50' },
                { label: t('summer'), icon: '☀️', air: displayData.temp_summer_air, sea: displayData.temp_summer_sea, bg: 'bg-yellow-50 border border-yellow-100' },
                { label: t('autumn'), icon: '🍂', air: displayData.temp_autumn_air, sea: displayData.temp_autumn_sea, bg: 'bg-gray-50' },
                { label: t('winter'), icon: '❄️', air: displayData.temp_winter_air, sea: displayData.temp_winter_sea, bg: 'bg-gray-50' }
              ].map((season, idx) => (
                <div key={idx} className={`${season.bg} rounded-xl p-4 text-center shadow-sm`}>
                  <div className="text-gray-500 font-bold mb-2 flex items-center justify-center gap-1">{season.icon} {season.label}</div>
                  <div className="text-sm space-y-1">
                    {hasTemp(season.air) && (
                      <div><span className="text-gray-400">{t('air')}:</span> <span className="font-bold">{season.air}°C</span></div>
                    )}
                    {hasTemp(season.sea) && (
                      <div><span className="text-gray-400">{t('sea')}:</span> <span className="font-bold text-blue-600">{season.sea}°C</span></div>
                    )}
                    {!hasTemp(season.air) && !hasTemp(season.sea) && (
                      <div className="text-gray-300 italic text-xs">Bez dat</div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* DETAILNÍ TEXTY */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          {displayData.general_info && (
            <div className="bg-white rounded-2xl shadow-sm p-8 border border-gray-100">
              <h2 className="text-xl font-bold mb-4 text-blue-900 flex items-center gap-2"><span>📍</span> {t('general_info')}</h2>
              <ReactMarkdown components={markdownComponents}>{displayData.general_info}</ReactMarkdown>
            </div>
          )}
          {displayData.nature_and_landscapes && (
            <div className="bg-white rounded-2xl shadow-sm p-8 border border-gray-100">
              <h2 className="text-xl font-bold mb-4 text-blue-900 flex items-center gap-2"><span>🌲</span> {t('nature')}</h2>
              <ReactMarkdown components={markdownComponents}>{displayData.nature_and_landscapes}</ReactMarkdown>
            </div>
          )}
          {displayData.history_and_culture && (
            <div className="bg-white rounded-2xl shadow-sm p-8 border border-gray-100">
              <h2 className="text-xl font-bold mb-4 text-blue-900 flex items-center gap-2"><span>🍷</span> {t('history')}</h2>
              <ReactMarkdown components={markdownComponents}>{displayData.history_and_culture}</ReactMarkdown>
            </div>
          )}
          {displayData.transport_and_life && (
            <div className="bg-white rounded-2xl shadow-sm p-8 border border-gray-100">
              <h2 className="text-xl font-bold mb-4 text-blue-900 flex items-center gap-2"><span>👨‍👩‍👧‍👦</span> {t('transport')}</h2>
              <ReactMarkdown components={markdownComponents}>{displayData.transport_and_life}</ReactMarkdown>
            </div>
          )}
        </div>

      </section>
    </main>
  );
}