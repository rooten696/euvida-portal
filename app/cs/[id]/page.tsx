import { createClient } from '@supabase/supabase-js';
import { notFound } from 'next/navigation';
import Link from 'next/link';
import ReactMarkdown from 'react-markdown';

// 1. Připojení k databázi
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

// 2. DYNAMICKÁ METADATA (Pro Google a sdílení na sítě)
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
    title: `${country.name} | Euvida - Průvodce zemí`,
    description: country.description,
    openGraph: {
      title: `${country.name}: Vše o životě a cestování`,
      description: country.description,
      images: [
        {
          url: country.image_url || '/og-default.jpg',
          width: 1200,
          height: 630,
        },
      ],
    },
  };
}

// 3. HLAVNÍ KOMPONENTA STRÁNKY
export default async function CountryPage({ params }: { params: Promise<{ id: string }> }) {
  const resolvedParams = await params;
  const countryId = resolvedParams.id;

  // Stáhnutí všech dat o konkrétní zemi
  const { data: country, error } = await supabase
    .from('countries')
    .select('*')
    .eq('id', countryId)
    .single();

  if (error || !country) {
    notFound();
  }

  // Konfigurace pro Markdown: Jak mají vypadat odstavce a tučné písmo
  // (Píšeme to takto bezpečně, aby Vercel nehlásil chybu na typ "any")
  const markdownComponents = {
    p: (props: React.ComponentPropsWithoutRef<'p'>) => <p className="text-gray-700 leading-relaxed mb-4" {...props} />,
    strong: (props: React.ComponentPropsWithoutRef<'strong'>) => <strong className="font-bold text-blue-900" {...props} />,
    ul: (props: React.ComponentPropsWithoutRef<'ul'>) => <ul className="list-disc pl-5 mb-4 text-gray-700 space-y-1" {...props} />,
    li: (props: React.ComponentPropsWithoutRef<'li'>) => <li {...props} />
  };

  return (
    <main className="min-h-screen bg-gray-50 text-gray-900 font-sans">
      
      {/* Tlačítko Zpět (Upravené tak, aby bylo vidět i přes fotku) */}
      <div className="absolute top-6 left-4 md:left-auto md:max-w-5xl md:mx-auto w-full z-30 px-4">
        <Link href="/" className="inline-flex items-center gap-2 bg-white/90 backdrop-blur-sm px-4 py-2 rounded-full text-blue-900 font-bold hover:bg-white shadow-sm transition-colors">
          &larr; Zpět na přehled
        </Link>
      </div>

      {/* Filmová hlavička s fotkou */}
      <header className="relative py-32 px-4 text-center overflow-hidden border-b-4 border-yellow-400 min-h-[50vh] flex flex-col justify-center">
        {country.image_url ? (
          <div 
            className="absolute inset-0 z-0 bg-cover bg-center"
            style={{ backgroundImage: `url('${country.image_url}')` }}
          />
        ) : (
          <div className="absolute inset-0 z-0 bg-blue-900" />
        )}
        
        <div className="absolute inset-0 bg-slate-900/60 z-10" />

        <div className="relative z-20">
          <div className="text-6xl mb-4 drop-shadow-md">{country.flag}</div>
          <h1 className="text-6xl font-extrabold mb-4 text-white drop-shadow-lg tracking-tight">
            {country.name}
          </h1>
          <p className="text-xl text-gray-100 max-w-2xl mx-auto drop-shadow-md font-medium leading-relaxed">
            {country.description}
          </p>
        </div>
      </header>

      {/* Obsahová část rozdělená do mřížky */}
      <section className="max-w-5xl mx-auto py-12 px-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          
          {country.general_info && (
            <div className="bg-white rounded-2xl shadow-sm p-8 border border-gray-100">
              <h2 className="text-2xl font-bold mb-4 text-blue-900 flex items-center gap-2">
                <span>📍</span> Obecné informace
              </h2>
              <ReactMarkdown components={markdownComponents}>{country.general_info}</ReactMarkdown>
            </div>
          )}

          {country.travel_tourism && (
            <div className="bg-white rounded-2xl shadow-sm p-8 border border-gray-100">
              <h2 className="text-2xl font-bold mb-4 text-blue-900 flex items-center gap-2">
                <span>✈️</span> Cestování a turistika
              </h2>
              <ReactMarkdown components={markdownComponents}>{country.travel_tourism}</ReactMarkdown>
            </div>
          )}

          {country.life_work && (
            <div className="bg-white rounded-2xl shadow-sm p-8 border border-gray-100">
              <h2 className="text-2xl font-bold mb-4 text-blue-900 flex items-center gap-2">
                <span>💼</span> Život a práce
              </h2>
              <ReactMarkdown components={markdownComponents}>{country.life_work}</ReactMarkdown>
            </div>
          )}

          {country.culture_food && (
            <div className="bg-white rounded-2xl shadow-sm p-8 border border-gray-100">
              <h2 className="text-2xl font-bold mb-4 text-blue-900 flex items-center gap-2">
                <span>🍷</span> Kultura a jídlo
              </h2>
              <ReactMarkdown components={markdownComponents}>{country.culture_food}</ReactMarkdown>
            </div>
          )}

        </div>
      </section>

    </main>
  );
}