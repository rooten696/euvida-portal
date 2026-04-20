'use client';

import Link from 'next/link';
import { createClient } from '@supabase/supabase-js';
import { useEffect, useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

// Nový typ pro země
type Country = {
  id: string;
  name: string;
  flag: string;
};

export default function Navbar() {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [user, setUser] = useState<any>(null);
  
  // Nové stavy pro menu
  const [countries, setCountries] = useState<Country[]>([]);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    // 1. Zjistíme, jestli je někdo přihlášený hned po načtení
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
    });

    // 2. Posloucháme, jestli se někdo právě nepřihlásil/neodhlásil
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
      router.refresh();
    });

    return () => subscription.unsubscribe();
  }, [router]);

  // 3. Načtení seznamu zemí pro rozbalovací menu
  useEffect(() => {
    const fetchCountries = async () => {
      const { data } = await supabase.from('countries').select('id, name, flag').order('name');
      if (data) setCountries(data);
    };
    fetchCountries();
  }, []);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.push('/');
  };

  // V administraci menu schováme, ať nám nebere místo na obrazovce
  if (pathname.startsWith('/admin')) {
    return null;
  }

  return (
    <nav className="bg-white/90 backdrop-blur-md border-b border-gray-100 shadow-sm sticky top-0 z-50 transition-all">
      <div className="max-w-6xl mx-auto px-4 py-4 flex justify-between items-center">
        
        {/* LEVÁ ČÁST: Logo a Menu destinací */}
        <div className="flex items-center gap-8">
          {/* Logo */}
          <Link href="/" className="text-2xl font-extrabold text-blue-900 tracking-tighter hover:opacity-80 transition-opacity">
            EUVIDA<span className="text-yellow-400">.</span>
          </Link>

        {/* Desktop Rozbalovací menu Země */}
          <div className="hidden md:block relative" onMouseLeave={() => setIsDropdownOpen(false)}>
            {/* Přidán padding-bottom (pb-4) na tlačítko, aby zasahovalo až k menu */}
            <button 
              onMouseEnter={() => setIsDropdownOpen(true)}
              className="text-gray-600 hover:text-blue-900 font-bold transition-colors flex items-center gap-1 pb-4"
            >
              Destinace <span className="text-xs text-gray-400">▼</span>
            </button>

            {isDropdownOpen && (
              /* Odstraněno mt-4, přidán top-[calc(100%-1rem)] aby menu sedělo přesně pod průhledným mostem tlačítka */
              <div className="absolute top-[calc(100%-1rem)] left-0 w-56 bg-white rounded-2xl shadow-xl border border-gray-100 py-2 overflow-hidden animate-in fade-in slide-in-from-top-2">
                {countries.map(country => (
                  <Link 
                    key={country.id} 
                    href={`/cs/${country.id}`}
                    className="block px-4 py-3 text-sm text-gray-700 hover:bg-blue-50 hover:text-blue-900 font-bold transition-colors"
                    onClick={() => setIsDropdownOpen(false)}
                  >
                    <span className="mr-3 text-lg">{country.flag}</span> {country.name}
                  </Link>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* PRAVÁ ČÁST: Přihlášení a tlačítka */}
        <div className="flex items-center gap-4 md:gap-6">
          {user ? (
            <>
              {/* Tlačítko pro oblíbené */}
              <Link href="/oblibene" className="text-gray-600 hover:text-red-500 font-bold flex items-center gap-1 transition-colors text-sm md:text-base">
                <span className="text-red-500">❤️</span> <span className="hidden sm:inline">Oblíbené</span>
              </Link>
              
              <div className="hidden md:block text-xs font-medium text-gray-400 bg-gray-50 px-3 py-1 rounded-full border border-gray-100">
                {user.email}
              </div>
              
              <button onClick={handleLogout} className="bg-gray-100 text-gray-700 px-4 py-2 rounded-xl text-sm font-bold hover:bg-gray-200 transition-colors">
                Odhlásit
              </button>
            </>
          ) : (
            <Link href="/login" className="bg-blue-900 text-white px-6 py-2 rounded-xl text-sm font-bold hover:bg-blue-800 transition-all shadow-md hover:shadow-lg">
              Přihlásit
            </Link>
          )}

          {/* Mobilní menu - hamburger tlačítko */}
          <button 
            className="md:hidden text-gray-600 text-2xl w-8 text-center" 
            onClick={() => setIsMenuOpen(!isMenuOpen)}
          >
            {isMenuOpen ? '✖' : '☰'}
          </button>
        </div>
        
      </div>

      {/* MOBILNÍ ROZBALOVACÍ MENU (Zobrazí se jen na malých displejích) */}
      {isMenuOpen && (
        <div className="md:hidden bg-white border-t border-gray-100 px-4 pt-4 pb-6 shadow-xl absolute w-full left-0 top-full">
          <div className="px-2 pb-2 text-xs font-bold text-gray-400 uppercase tracking-wider">
            Země a destinace
          </div>
          <div className="space-y-1 max-h-[60vh] overflow-y-auto">
            {countries.map(country => (
              <Link 
                key={country.id} 
                href={`/cs/${country.id}`}
                onClick={() => setIsMenuOpen(false)}
                className="block px-4 py-3 text-base font-bold text-gray-700 hover:bg-blue-50 hover:text-blue-900 rounded-xl transition-colors"
              >
                <span className="mr-3">{country.flag}</span> {country.name}
              </Link>
            ))}
          </div>
        </div>
      )}
    </nav>
  );
}