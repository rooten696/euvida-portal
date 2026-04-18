'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@supabase/supabase-js';
import Link from 'next/link';

// Připojení k databázi
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

// Co přesně o zemi potřebujeme pro hlavní stránku vědět
type Country = {
  id: string;
  name: string;
  flag: string;
  description: string;
  image_url: string;
};

export default function HomePage() {
  const [countries, setCountries] = useState<Country[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);

  // Při načtení stránky stáhneme všech 33 zemí
  useEffect(() => {
    const fetchCountries = async () => {
      const { data } = await supabase
        .from('countries')
        .select('id, name, flag, description, image_url')
        .order('name');
      
      if (data) setCountries(data);
      setLoading(false);
    };
    fetchCountries();
  }, []);

  // Tahle magie okamžitě filtruje země podle toho, co napíšeš do hledání
  // Hledá to jak v názvu (např. "Španělsko"), tak v popisku (např. "moře")
  const filteredCountries = countries.filter(country => 
    country.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    country.description.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Zobrazíme kolečko, dokud se data nestáhnou
  if (loading) {
    return (
      <main className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-900"></div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-gray-50 font-sans pb-20">
      
      {/* 1. Uvítací hlavička (Hero Section) */}
      <section className="bg-blue-900 text-white py-24 px-4 text-center relative overflow-hidden">
        {/* Jemná cestovatelská fotka na pozadí */}
        <div className="absolute inset-0 opacity-20 bg-[url('https://images.unsplash.com/photo-1469854523086-cc02fe5d8800?q=80&w=2021&auto=format&fit=crop')] bg-cover bg-center" />
        
        <div className="relative z-10 max-w-4xl mx-auto">
          <h1 className="text-5xl md:text-7xl font-extrabold mb-6 tracking-tight">
            Objevte Evropu <br className="hidden md:block" />
            <span className="text-yellow-400">bez hranic.</span>
          </h1>
          <p className="text-xl md:text-2xl text-blue-100 mb-10 font-medium">
            Tvůj průvodce cestováním, prací a životem ve 33 zemích.
          </p>
          
          {/* Vyhledávací pole */}
          <div className="relative max-w-2xl mx-auto">
            <span className="absolute left-5 top-4 text-2xl">🔍</span>
            <input 
              type="text" 
              placeholder="Kam to bude? (např. Itálie, hory, pivo...)"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full py-5 pl-14 pr-6 rounded-full text-gray-900 text-lg shadow-2xl focus:outline-none focus:ring-4 focus:ring-yellow-400 transition-all font-medium border-0"
            />
          </div>
        </div>
      </section>

      {/* 2. Mřížka se zeměmi */}
      <section className="max-w-7xl mx-auto px-4 mt-16">
        <div className="flex flex-col md:flex-row justify-between items-center mb-10 gap-4">
          <h2 className="text-3xl font-extrabold text-blue-900">
            {searchQuery ? 'Výsledky vyhledávání' : 'Všechny destinace'}
          </h2>
          <span className="text-blue-900 font-bold bg-blue-100 px-4 py-2 rounded-full text-sm">
            Nalezeno: {filteredCountries.length}
          </span>
        </div>

        {/* Pokud nic nenajdeme */}
        {filteredCountries.length === 0 ? (
           <div className="text-center py-20 bg-white rounded-3xl shadow-sm border border-gray-100">
             <div className="text-6xl mb-4">🙈</div>
             <h3 className="text-2xl font-bold text-gray-800">Tady nic není</h3>
             <p className="text-gray-500 mt-2">Zkus hledat něco jiného (třeba &quot;Francie&quot;).</p>
             <button onClick={() => setSearchQuery('')} className="mt-6 text-blue-600 font-bold hover:underline">
               Zrušit hledání
             </button>
           </div>
        ) : (
          /* Výpis karet */
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-8">
            {filteredCountries.map(country => (
              <Link 
                key={country.id} 
                href={`/cs/${country.id}`} 
                className="group bg-white rounded-3xl overflow-hidden shadow-sm hover:shadow-2xl transition-all duration-300 border border-gray-100 flex flex-col h-full hover:-translate-y-2"
              >
                {/* Obrázek s vlajkou */}
                <div className="h-48 relative overflow-hidden bg-blue-900">
                  {country.image_url && (
                    <div 
                      className="absolute inset-0 bg-cover bg-center group-hover:scale-110 transition-transform duration-700"
                      style={{ backgroundImage: `url('${country.image_url}')` }}
                    />
                  )}
                  <div className="absolute inset-0 bg-gradient-to-t from-slate-900/80 to-transparent" />
                  <div className="absolute bottom-4 left-4 text-5xl drop-shadow-lg">{country.flag}</div>
                </div>

                {/* Texty na kartě */}
                <div className="p-6 flex-grow flex flex-col">
                  <h3 className="text-2xl font-bold text-gray-900 mb-2 group-hover:text-blue-600 transition-colors">
                    {country.name}
                  </h3>
                  <p className="text-gray-600 text-sm line-clamp-3 mb-6 flex-grow leading-relaxed">
                    {country.description}
                  </p>
                  <div className="text-blue-600 font-bold text-sm bg-blue-50 py-3 px-4 rounded-xl text-center group-hover:bg-blue-600 group-hover:text-white transition-colors mt-auto">
                    Prozkoumat průvodce
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}
      </section>
    </main>
  );
}