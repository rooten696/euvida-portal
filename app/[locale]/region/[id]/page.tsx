import { createClient } from '@supabase/supabase-js';
import { notFound } from 'next/navigation';
import Link from 'next/link';
import ReactMarkdown from 'react-markdown';
import WeatherWidget from '@/app/components/WeatherWidget';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

// Definice pro Místo, aby byl TypeScript spokojený
type Place = {
  id: string;
  name: string;
  description: string;
  image_url: string;
};

export default async function RegionPage({ params }: { params: Promise<{ id: string }> }) {
  const resolvedParams = await params;
  const regionId = resolvedParams.id;

  const { data: region } = await supabase
    .from('regions')
    .select(`*, countries ( id, name )`)
    .eq('id', regionId)
    .single();

  if (!region) notFound();

  const { data: places } = await supabase
    .from('places')
    .select('*')
    .eq('region_id', regionId)
    .order('name');

  const markdownComponents = {
    p: (props: React.ComponentPropsWithoutRef<'p'>) => <p className="text-gray-700 leading-relaxed mb-4" {...props} />,
    strong: (props: React.ComponentPropsWithoutRef<'strong'>) => <strong className="font-bold text-blue-900" {...props} />,
    ul: (props: React.ComponentPropsWithoutRef<'ul'>) => <ul className="list-disc pl-5 mb-4 text-gray-700 space-y-1" {...props} />,
    li: (props: React.ComponentPropsWithoutRef<'li'>) => <li {...props} />
  };

  return (
    <main className="min-h-screen bg-gray-50 text-gray-900 font-sans pb-20">
      
      {/* Tlačítko Zpět */}
      <div className="absolute top-6 left-4 md:left-auto md:max-w-5xl md:mx-auto w-full z-30 px-4">
        <Link href={`/cs/${region.countries.id}`} className="inline-flex items-center gap-2 bg-white/90 backdrop-blur-sm px-4 py-2 rounded-full text-blue-900 font-bold hover:bg-white shadow-sm transition-colors">
          &larr; Zpět na {region.countries.name}
        </Link>
      </div>

      {/* Hlavička */}
      <header className="relative py-32 px-4 text-center overflow-hidden border-b-4 border-yellow-400 min-h-[40vh] flex flex-col justify-center">
        {region.image_url ? (
          <div className="absolute inset-0 z-0 bg-cover bg-center" style={{ backgroundImage: `url('${region.image_url}')` }} />
        ) : (
          <div className="absolute inset-0 z-0 bg-blue-900" />
        )}
        <div className="absolute inset-0 bg-slate-900/60 z-10" />

        <div className="relative z-20 max-w-3xl mx-auto flex flex-col items-center">
          {region.language && (
            <span className="bg-yellow-400 text-yellow-900 font-bold px-3 py-1 rounded-full text-sm mb-4 uppercase tracking-wider shadow-md">
              Jazyk: {region.language}
            </span>
          )}
          <h1 className="text-5xl md:text-6xl font-extrabold mb-6 text-white drop-shadow-lg tracking-tight">
            {region.name}
          </h1>
          
          <WeatherWidget locationName={region.name} />
        </div>
      </header>

      <section className="max-w-5xl mx-auto py-12 px-4 space-y-16">
        
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-start">
          
          {/* NOVÉ: Detailní texty o regionu rozdělené do krásných bloků */}
          <div className="lg:col-span-2 space-y-8">
            {/* Pokud staré políčko 'description' stále existuje a nemáme nové, zobrazíme ho jako fallback */}
            {!region.general_info && region.description && (
              <div className="bg-white rounded-3xl p-8 shadow-sm border border-gray-100">
                <ReactMarkdown components={markdownComponents}>{region.description}</ReactMarkdown>
              </div>
            )}

            {region.general_info && (
              <div className="bg-white rounded-3xl p-8 shadow-sm border border-gray-100">
                <h2 className="text-2xl font-bold mb-6 text-blue-900 flex items-center gap-2"><span>📍</span> O regionu</h2>
                <ReactMarkdown components={markdownComponents}>{region.general_info}</ReactMarkdown>
              </div>
            )}

            {region.nature_and_landscapes && (
              <div className="bg-white rounded-3xl p-8 shadow-sm border border-gray-100">
                <h2 className="text-2xl font-bold mb-6 text-blue-900 flex items-center gap-2"><span>🌲</span> Výlety a příroda</h2>
                <ReactMarkdown components={markdownComponents}>{region.nature_and_landscapes}</ReactMarkdown>
              </div>
            )}

            {region.history_and_culture && (
              <div className="bg-white rounded-3xl p-8 shadow-sm border border-gray-100">
                <h2 className="text-2xl font-bold mb-6 text-blue-900 flex items-center gap-2"><span>🍷</span> Gastronomie a atmosféra</h2>
                <ReactMarkdown components={markdownComponents}>{region.history_and_culture}</ReactMarkdown>
              </div>
            )}

            {region.transport_and_life && (
              <div className="bg-white rounded-3xl p-8 shadow-sm border border-gray-100">
                <h2 className="text-2xl font-bold mb-6 text-blue-900 flex items-center gap-2"><span>👨‍👩‍👧‍👦</span> Pro koho to je a děti</h2>
                <ReactMarkdown components={markdownComponents}>{region.transport_and_life}</ReactMarkdown>
              </div>
            )}
          </div>

          {/* Pravý sloupec s teplotami (zůstává stejný) */}
          <div className="lg:col-span-1 bg-white rounded-3xl p-8 shadow-sm border border-gray-100 sticky top-8">
            <h2 className="text-xl font-bold mb-6 text-blue-900 flex items-center gap-2">
              <span>🌡️</span> Průměrné teploty
            </h2>
            <div className="space-y-4">
              {[
                { label: 'Jaro', icon: '🌸', air: region.temp_spring_air, sea: region.temp_spring_sea },
                { label: 'Léto', icon: '☀️', air: region.temp_summer_air, sea: region.temp_summer_sea },
                { label: 'Podzim', icon: '🍂', air: region.temp_autumn_air, sea: region.temp_autumn_sea },
                { label: 'Zima', icon: '❄️', air: region.temp_winter_air, sea: region.temp_winter_sea },
              ].map((season) => (
                <div key={season.label} className="flex justify-between items-center border-b border-gray-50 pb-2 last:border-0">
                  <span className="font-bold text-gray-700 flex items-center gap-2">
                    {season.icon} {season.label}
                  </span>
                  <div className="text-right text-sm">
                    {season.air && season.air !== 'N/A' && <div className="text-orange-600 font-bold" title="Vzduch">{season.air} °C <span className="text-xs text-gray-400 font-normal ml-1">vzduch</span></div>}
                    {season.sea && season.sea !== 'N/A' && <div className="text-blue-600 font-bold" title="Moře">{season.sea} °C <span className="text-xs text-gray-400 font-normal ml-1">moře</span></div>}
                  </div>
                </div>
              ))}
            </div>
          </div>

        </div>

        {/* Sekce s Místy (Památky a města) */}
        {places && places.length > 0 && (
          <div>
            <h2 className="text-3xl font-extrabold text-blue-900 mb-8 flex items-center gap-3">
              <span className="text-green-600">📍</span> Místa, která musíte vidět
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {places.map((place: Place) => (
                <div key={place.id} className="bg-white rounded-3xl overflow-hidden shadow-sm border border-gray-100 hover:shadow-md transition-shadow flex flex-col">
                  {place.image_url && (
                    <div className="h-48 overflow-hidden shrink-0">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={place.image_url} alt={place.name} className="w-full h-full object-cover hover:scale-105 transition-transform duration-500" />
                    </div>
                  )}
                  <div className="p-6 flex-grow flex flex-col">
                    <h3 className="text-xl font-bold text-gray-900 mb-4">{place.name}</h3>
                    <div className="flex-grow text-sm">
                      <ReactMarkdown components={markdownComponents}>{place.description}</ReactMarkdown>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

      </section>
    </main>
  );
}