import { createClient } from '@supabase/supabase-js';
import { notFound } from 'next/navigation';
import Link from 'next/link';
import ReactMarkdown from 'react-markdown';
import FavoriteButton from '@/app/components/FavoriteButton';

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
};

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }) {
  const resolvedParams = await params;
  const countryId = resolvedParams.id;

  const { data: country } = await supabase
    .from('countries')
    .select('name, description, image_url')
    .eq('id', countryId)
    .single();

  if (!country) return { title: 'Země nenalezena | Euvida' };

  return {
    title: `${country.name} | Euvida`,
    description: country.description,
    openGraph: {
      title: `${country.name}: Vše o životě a cestování`,
      description: country.description,
      images: [{ url: country.image_url || '/og-default.jpg' }],
    },
  };
}

export default async function CountryPage({ params }: { params: Promise<{ id: string }> }) {
  const resolvedParams = await params;
  const countryId = resolvedParams.id;

  const { data: country } = await supabase
    .from('countries')
    .select('*')
    .eq('id', countryId)
    .single();

  if (!country) notFound();

  const { data: regions } = await supabase
    .from('regions')
    .select('*')
    .eq('country_id', countryId)
    .order('name');

  // Markdown styly pro velké bloky (Země)
  const markdownComponents = {
    p: (props: React.ComponentPropsWithoutRef<'p'>) => <p className="text-gray-700 leading-relaxed mb-4" {...props} />,
    strong: (props: React.ComponentPropsWithoutRef<'strong'>) => <strong className="font-bold text-blue-900" {...props} />,
    ul: (props: React.ComponentPropsWithoutRef<'ul'>) => <ul className="list-disc pl-5 mb-4 text-gray-700 space-y-1" {...props} />,
    li: (props: React.ComponentPropsWithoutRef<'li'>) => <li {...props} />
  };

  // Markdown styly pro malé kartičky (Regiony)
  const regionMarkdownComponents = {
    p: (props: React.ComponentPropsWithoutRef<'p'>) => <p className="text-gray-600 text-sm leading-relaxed mb-3 line-clamp-3" {...props} />,
    strong: (props: React.ComponentPropsWithoutRef<'strong'>) => <strong className="font-bold text-gray-900" {...props} />,
    ul: (props: React.ComponentPropsWithoutRef<'ul'>) => <ul className="list-disc pl-4 mb-3 text-gray-600 text-sm space-y-1" {...props} />,
    li: (props: React.ComponentPropsWithoutRef<'li'>) => <li {...props} />
  };

  return (
    <main className="min-h-screen bg-gray-50 text-gray-900 font-sans">
      
      <div className="absolute top-6 left-4 md:left-auto md:max-w-5xl md:mx-auto w-full z-30 px-4">
        <Link href="/" className="inline-flex items-center gap-2 bg-white/90 backdrop-blur-sm px-4 py-2 rounded-full text-blue-900 font-bold hover:bg-white shadow-sm transition-colors">
          &larr; Zpět na přehled
        </Link>
      </div>

      <header className="relative py-32 px-4 text-center overflow-hidden border-b-4 border-yellow-400 min-h-[50vh] flex flex-col justify-center">
        {country.image_url ? (
          <div className="absolute inset-0 z-0 bg-cover bg-center" style={{ backgroundImage: `url('${country.image_url}')` }} />
        ) : (
          <div className="absolute inset-0 z-0 bg-blue-900" />
        )}
        <div className="absolute inset-0 bg-slate-900/60 z-10" />

        <div className="relative z-20">
          <div className="text-6xl mb-4 drop-shadow-md">{country.flag}</div>
          <h1 className="text-6xl font-extrabold mb-4 text-white drop-shadow-lg tracking-tight">{country.name}</h1>
          <p className="text-xl text-gray-100 max-w-2xl mx-auto drop-shadow-md font-medium leading-relaxed mb-8">{country.description}</p>
          
          <div className="flex justify-center">
            <FavoriteButton countryId={country.id} />
          </div>
        </div>
      </header>

      <section className="max-w-5xl mx-auto py-12 px-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-16">
          {country.general_info && (
            <div className="bg-white rounded-2xl shadow-sm p-8 border border-gray-100">
              <h2 className="text-2xl font-bold mb-4 text-blue-900 flex items-center gap-2"><span>📍</span> Obecné informace</h2>
              <ReactMarkdown components={markdownComponents}>{country.general_info}</ReactMarkdown>
            </div>
          )}
          {country.travel_tourism && (
            <div className="bg-white rounded-2xl shadow-sm p-8 border border-gray-100">
              <h2 className="text-2xl font-bold mb-4 text-blue-900 flex items-center gap-2"><span>✈️</span> Cestování</h2>
              <ReactMarkdown components={markdownComponents}>{country.travel_tourism}</ReactMarkdown>
            </div>
          )}
          {country.life_work && (
            <div className="bg-white rounded-2xl shadow-sm p-8 border border-gray-100">
              <h2 className="text-2xl font-bold mb-4 text-blue-900 flex items-center gap-2"><span>💼</span> Život a práce</h2>
              <ReactMarkdown components={markdownComponents}>{country.life_work}</ReactMarkdown>
            </div>
          )}
          {country.culture_food && (
            <div className="bg-white rounded-2xl shadow-sm p-8 border border-gray-100">
              <h2 className="text-2xl font-bold mb-4 text-blue-900 flex items-center gap-2"><span>🍷</span> Kultura a jídlo</h2>
              <ReactMarkdown components={markdownComponents}>{country.culture_food}</ReactMarkdown>
            </div>
          )}
        </div>

        {regions && regions.length > 0 && (
          <div className="mt-20">
            <h2 className="text-3xl font-extrabold text-blue-900 mb-8 flex items-center gap-3">
              <span className="text-yellow-500">🗺️</span> Regiony a oblasti
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              {regions.map((region: Region) => (
                <Link href={`/region/${region.id}`} key={region.id} className="bg-white rounded-3xl overflow-hidden shadow-sm border border-gray-100 group hover:shadow-xl hover:-translate-y-1 transition-all flex flex-col cursor-pointer">
                  {region.image_url && (
                    <div className="h-48 overflow-hidden shrink-0">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img 
                        src={region.image_url} 
                        alt={region.name} 
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" 
                      />
                    </div>
                  )}
                  <div className="p-6 flex-grow flex flex-col">
                    <div className="flex justify-between items-start mb-4">
                      <h3 className="text-xl font-bold text-gray-900 group-hover:text-blue-600 transition-colors">{region.name}</h3>
                      {region.language && (
                        <span className="text-xs font-bold bg-blue-50 text-blue-600 px-2 py-1 rounded-md uppercase shrink-0 ml-2">
                          {region.language}
                        </span>
                      )}
                    </div>
                    <div className="flex-grow">
                      <ReactMarkdown components={regionMarkdownComponents}>
                        {region.description}
                      </ReactMarkdown>
                    </div>
                    <div className="mt-4 text-sm font-bold text-blue-600 group-hover:text-blue-800 flex items-center gap-1">
                      Prozkoumat region <span className="text-lg">&rarr;</span>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        )}
      </section>
    </main>
  );
}