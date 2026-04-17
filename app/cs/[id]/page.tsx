import { createClient } from '@supabase/supabase-js';
import { notFound } from 'next/navigation';
import Link from 'next/link';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

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

      <header className="bg-blue-900 text-white py-16 px-4 text-center border-b-4 border-yellow-400">
        <div className="text-6xl mb-4">{country.flag}</div>
        <h1 className="text-5xl font-bold mb-4">{country.name}</h1>
        <p className="text-xl text-blue-100 max-w-2xl mx-auto">
          {country.description}
        </p>
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
