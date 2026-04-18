'use client';

import { useState, useEffect, useCallback } from 'react';
import { createClient } from '@supabase/supabase-js';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

// Definice toho, co z databáze dostaneme
type SavedCountry = {
  id: string;
  name: string;
  flag: string;
  description: string;
  image_url: string;
};

export default function FavoritesPage() {
  const [countries, setCountries] = useState<SavedCountry[]>([]);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  const fetchFavorites = useCallback(async (userId: string) => {
    // Magický dotaz: Propojení tabulky Favorites s tabulkou Countries
    const { data, error } = await supabase
      .from('favorites')
      .select(`
        country_id,
        countries (
          id,
          name,
          flag,
          description,
          image_url
        )
      `)
      .eq('user_id', userId);

    if (error) {
      console.error('Chyba při načítání:', error);
    } else if (data) {
      // Supabase to vrátí zabalené, my si to rozbalíme do čistého pole zemí
      // Používáme "as jakýkoliv typ", abychom to bezpečně převedli pro TypeScript
      const formatted = data
        .map(item => item.countries)
        .filter(Boolean) as unknown as SavedCountry[]; 
        
      setCountries(formatted);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!session?.user) {
        // Pokud sem vleze někdo nepřihlášený, vyhodíme ho na login
        router.push('/login');
      } else {
        fetchFavorites(session.user.id);
      }
    });
  }, [fetchFavorites, router]);

  if (loading) {
    return (
      <main className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-900"></div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-gray-50 py-12 px-4 font-sans">
      <div className="max-w-6xl mx-auto">
        
        <header className="mb-12 text-center">
          <h1 className="text-4xl font-extrabold text-blue-900 mb-4 flex items-center justify-center gap-3">
            <span className="text-red-500">❤️</span> Tvoje oblíbené destinace
          </h1>
          <p className="text-gray-600 max-w-2xl mx-auto">
            Místa, která tě zaujala. Plánuj, sní a objevuj svůj budoucí domov v Evropě.
          </p>
        </header>

        {countries.length === 0 ? (
          <div className="bg-white rounded-3xl shadow-sm p-12 text-center border border-gray-100 max-w-2xl mx-auto">
            <div className="text-6xl mb-4">🗺️</div>
            <h2 className="text-2xl font-bold text-gray-800 mb-2">Zatím tu je prázdno</h2>
            <p className="text-gray-500 mb-8">
              Ještě sis neuložil žádnou zemi. Běž prozkoumat náš katalog a klikni na srdíčko u míst, která tě lákají!
            </p>
            <Link href="/" className="bg-blue-900 text-white font-bold py-3 px-8 rounded-full hover:bg-blue-800 transition-colors">
              Prozkoumat země
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {countries.map((country) => (
              <Link key={country.id} href={`/cs/${country.id}`} className="group bg-white rounded-3xl overflow-hidden shadow-sm hover:shadow-xl transition-all border border-gray-100 flex flex-col">
                
                {/* Fotka země s mírným přiblížením po najetí myší */}
                <div className="h-48 relative overflow-hidden bg-blue-900">
                  {country.image_url && (
                    <div 
                      className="absolute inset-0 bg-cover bg-center group-hover:scale-105 transition-transform duration-500"
                      style={{ backgroundImage: `url('${country.image_url}')` }}
                    />
                  )}
                  <div className="absolute inset-0 bg-gradient-to-t from-slate-900/80 to-transparent" />
                  <div className="absolute bottom-4 left-4 text-4xl">{country.flag}</div>
                </div>

                {/* Textová část karty */}
                <div className="p-6 flex-grow flex flex-col">
                  <h2 className="text-xl font-bold text-gray-900 mb-2">{country.name}</h2>
                  <p className="text-gray-600 text-sm line-clamp-3 mb-4 flex-grow">
                    {country.description}
                  </p>
                  <div className="text-blue-600 font-bold text-sm group-hover:text-blue-800 transition-colors">
                    Otevřít průvodce &rarr;
                  </div>
                </div>

              </Link>
            ))}
          </div>
        )}

      </div>
    </main>
  );
}