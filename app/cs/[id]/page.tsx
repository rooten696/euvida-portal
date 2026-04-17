import { createClient } from '@supabase/supabase-js';
import { notFound } from 'next/navigation';
import Link from 'next/link';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

// Tato funkce vygeneruje unikátní metadata pro každou zemi na základě dat ze Supabase
export async function generateMetadata({ params }: { params: Promise<{ id: string }> }) {
  const resolvedParams = await params;
  const countryId = resolvedParams.id;

  // Stáhneme data pro metadata (stejně jako v těle stránky)
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
          url: country.image_url || '/og-default.jpg', // Použije fotku země pro náhled na sítích
          width: 1200,
          height: 630,
        },
      ],
    },
  };
}

export default async function CountryPage({ params }: { params: Promise<{ id: string }> }) {
  const resolvedParams = await params;
  const countryId = resolvedParams.id;

  const { data: country, error } = await supabase
    .from('countries')
    .select('*')
    .eq('id', countryId)
    .single();

  if (error || !country) {
    notFound();
  }

  return (
    <main className="min-h-screen bg-gray-50 text-gray-900 font-sans">
      
      {/* Hlavička */}
      <div className="max-w-5xl mx-auto px-4 py-6">
        <Link href="/" className="text-blue-600 hover:underline font-medium flex items-center gap-2">
          &larr; Zpět na přehled
        </Link>
      </div>

    {/* Nová, filmová hlavička s obrázkem na pozadí */}
      <header className="relative py-32 px-4 text-center overflow-hidden border-b-4 border-yellow-400">
        
        {/* Obrázek na pozadí (pokud v databázi existuje) */}
        {country.image_url ? (
          <div 
            className="absolute inset-0 z-0 bg-cover bg-center"
            style={{ backgroundImage: `url('${country.image_url}')` }}
          />
        ) : (
          /* Pojistka: Pokud země fotku nemá, ukáže se klasická modrá barva */
          <div className="absolute inset-0 z-0 bg-blue-900" />
        )}
        
        {/* Tmavý poloprůhledný filtr */}
        <div className="absolute inset-0 bg-slate-900/60 z-10" />

        {/* Texty hlavičky (zvednuté nad filtr díky z-20) */}
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
          
          {/* Box 1: Obecné informace */}
          {country.general_info && (
            <div className="bg-white rounded-2xl shadow-sm p-8 border border-gray-100">
              <h2 className="text-2xl font-bold mb-4 text-blue-900 flex items-center gap-2">
                <span>📍</span> Obecné informace
              </h2>
              <p className="text-gray-700 leading-relaxed">{country.general_info}</p>
            </div>
          )}

          {/* Box 2: Cestování a turistika */}
          {country.travel_tourism && (
            <div className="bg-white rounded-2xl shadow-sm p-8 border border-gray-100">
              <h2 className="text-2xl font-bold mb-4 text-blue-900 flex items-center gap-2">
                <span>✈️</span> Cestování a turistika
              </h2>
              <p className="text-gray-700 leading-relaxed">{country.travel_tourism}</p>
            </div>
          )}

          {/* Box 3: Život a práce */}
          {country.life_work && (
            <div className="bg-white rounded-2xl shadow-sm p-8 border border-gray-100">
              <h2 className="text-2xl font-bold mb-4 text-blue-900 flex items-center gap-2">
                <span>💼</span> Život a práce
              </h2>
              <p className="text-gray-700 leading-relaxed">{country.life_work}</p>
            </div>
          )}

          {/* Box 4: Kultura a jídlo */}
          {country.culture_food && (
            <div className="bg-white rounded-2xl shadow-sm p-8 border border-gray-100">
              <h2 className="text-2xl font-bold mb-4 text-blue-900 flex items-center gap-2">
                <span>🍷</span> Kultura a jídlo
              </h2>
              <p className="text-gray-700 leading-relaxed">{country.culture_food}</p>
            </div>
          )}

        </div>
      </section>

    </main>
  );
}
