import { createClient } from '@supabase/supabase-js';
import { notFound } from 'next/navigation';
import Link from 'next/link';

// Inicializace Supabase klienta (stejně jako na hlavní stránce)
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

// Tohle je naše chytrá šablona. Všimni si 'params', ze kterých získáme to 'id' z adresy.
export default async function CountryPage({ params }: { params: { id: string } }) {
  const countryId = params.id;

  // Dotaz do databáze: "Vyber všechno z tabulky countries, kde se id rovná zkratce z adresy, a vrať mi jen jeden výsledek (single)"
  const { data: country, error } = await supabase
    .from('countries')
    .select('*')
    .eq('id', countryId)
    .single();

  // Pokud země v databázi neexistuje, ukážeme klasickou chybovou stránku 404
  if (error || !country) {
    notFound();
  }

  return (
    <main className="min-h-screen bg-gray-50 text-gray-900 font-sans">
      
      {/* --- Tlačítko Zpět --- */}
      <div className="max-w-5xl mx-auto px-4 py-6">
        <Link href="/" className="text-blue-600 hover:underline font-medium flex items-center gap-2">
          &larr; Zpět na přehled
        </Link>
      </div>

      {/* --- Hlavička konkrétní země --- */}
      <header className="bg-blue-900 text-white py-16 px-4 text-center border-b-4 border-yellow-400">
        <div className="text-6xl mb-4">{country.flag}</div>
        <h1 className="text-5xl font-bold mb-4">{country.name}</h1>
        <p className="text-xl text-blue-100 max-w-2xl mx-auto">
          {country.description}
        </p>
      </header>

      {/* --- Obsahová část --- */}
      <section className="max-w-5xl mx-auto py-12 px-4">
        <div className="bg-white rounded-2xl shadow-sm p-8 border border-gray-100 mb-8">
          <h2 className="text-2xl font-bold mb-4 text-blue-900">Základní informace</h2>
          <p className="text-gray-700 leading-relaxed">
            Toto je automaticky vygenerovaná stránka pro <strong>{country.name}</strong>. 
            Všechna data v hlavičce (vlajka, název, popisek) se automaticky načetla ze Supabase. 
            Později si do databáze přidáme i sloupečky pro delší texty (práce, bydlení, kultura), 
            aby se nám to propsalo rovnou sem.
          </p>
        </div>
      </section>

    </main>
  );
}