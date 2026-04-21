'use client';

import Link from 'next/link';
import { createClient } from '@supabase/supabase-js';
import { useEffect, useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';
// 1. Importujeme hooky z next-intl pro překlady a jazyk
import { useTranslations, useLocale } from 'next-intl';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

type Country = {
  id: string;
  name: string;
  flag: string;
};

export default function Navbar() {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [user, setUser] = useState<any>(null);
  const [countries, setCountries] = useState<Country[]>([]);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  
  const router = useRouter();
  const pathname = usePathname();

  // 2. Aktivujeme překladač (slovník "Navigation") a zjistíme aktuální jazyk
  const t = useTranslations('Navigation');
  const locale = useLocale();

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
      router.refresh();
    });

    return () => subscription.unsubscribe();
  }, [router]);

  useEffect(() => {
    const fetchCountries = async () => {
      const { data } = await supabase.from('countries').select('id, name, flag').order('name');
      if (data) setCountries(data);
    };
    fetchCountries();
  }, []);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    // Po odhlášení přesměrujeme na hlavní stránku ve správném jazyce
    router.push(`/${locale}`);
  };

  // V administraci menu schováme
  if (pathname.includes('/admin')) {
    return null;
  }

  // 3. Kouzelná funkce pro přepnutí jazyka v adrese
  const switchLanguage = (newLocale: string) => {
    if (!pathname) return `/${newLocale}`;
    // Vyměníme /cs za /en (nebo naopak) přímo v URL adrese
    return pathname.replace(`/${locale}`, `/${newLocale}`);
  };

  return (
    <nav className="bg-white/90 backdrop-blur-md border-b border-gray-100 shadow-sm sticky top-0 z-50 transition-all">
      <div className="max-w-6xl mx-auto px-4 py-4 flex justify-between items-center">
        
        {/* LEVÁ ČÁST: Logo a Menu destinací */}
        <div className="flex items-center gap-8">
          {/* Logo nyní směřuje na /cs nebo /en */}
          <Link href={`/${locale}`} className="text-2xl font-extrabold text-blue-900 tracking-tighter hover:opacity-80 transition-opacity">
            EUVIDA<span className="text-yellow-400">.</span>
          </Link>

          <div className="hidden md:block relative" onMouseLeave={() => setIsDropdownOpen(false)}>
            <button 
              onMouseEnter={() => setIsDropdownOpen(true)}
              className="text-gray-600 hover:text-blue-900 font-bold transition-colors flex items-center gap-1 pb-4"
            >
              {/* Přeložené tlačítko "Destinace" */}
              {t('destinations')} <span className="text-xs text-gray-400">▼</span>
            </button>

            {isDropdownOpen && (
              <div className="absolute top-[calc(100%-1rem)] left-0 w-56 bg-white rounded-2xl shadow-xl border border-gray-100 py-2 overflow-hidden animate-in fade-in slide-in-from-top-2">
                {countries.map(country => (
                  <Link 
                    key={country.id} 
                    href={`/${locale}/country/${country.id}`}
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

        {/* PRAVÁ ČÁST: Přihlášení, tlačítka a přepínač jazyka */}
        <div className="flex items-center gap-4 md:gap-6">
          
          {/* 4. NOVINKA: Elegantní přepínač jazyka */}
          <div className="hidden sm:flex items-center gap-2 text-xs font-bold text-gray-400 bg-gray-50 px-2 py-1 rounded-lg border border-gray-100">
            <Link href={switchLanguage('cs')} className={`transition-colors hover:text-blue-900 ${locale === 'cs' ? 'text-blue-900' : ''}`}>CS</Link>
            <span>|</span>
            <Link href={switchLanguage('en')} className={`transition-colors hover:text-blue-900 ${locale === 'en' ? 'text-blue-900' : ''}`}>EN</Link>
          </div>

          {user ? (
            <>
              <Link href={`/${locale}/oblibene`} className="text-gray-600 hover:text-red-500 font-bold flex items-center gap-1 transition-colors text-sm md:text-base">
                <span className="text-red-500">❤️</span> <span className="hidden sm:inline">{t('favorites')}</span>
              </Link>
              
              <div className="hidden md:block text-xs font-medium text-gray-400 bg-gray-50 px-3 py-1 rounded-full border border-gray-100">
                {user.email}
              </div>
              
              <button onClick={handleLogout} className="bg-gray-100 text-gray-700 px-4 py-2 rounded-xl text-sm font-bold hover:bg-gray-200 transition-colors">
                {t('logout')}
              </button>
            </>
          ) : (
            <Link href={`/${locale}/login`} className="bg-blue-900 text-white px-6 py-2 rounded-xl text-sm font-bold hover:bg-blue-800 transition-all shadow-md hover:shadow-lg">
              {t('login')}
            </Link>
          )}

          <button 
            className="md:hidden text-gray-600 text-2xl w-8 text-center" 
            onClick={() => setIsMenuOpen(!isMenuOpen)}
          >
            {isMenuOpen ? '✖' : '☰'}
          </button>
        </div>
        
      </div>

      {/* MOBILNÍ ROZBALOVACÍ MENU */}
      {isMenuOpen && (
        <div className="md:hidden bg-white border-t border-gray-100 px-4 pt-4 pb-6 shadow-xl absolute w-full left-0 top-full">
          {/* Mobilní přepínač jazyka */}
          <div className="flex justify-center gap-4 mb-4 pb-4 border-b border-gray-50">
            <Link href={switchLanguage('cs')} onClick={() => setIsMenuOpen(false)} className={`font-bold ${locale === 'cs' ? 'text-blue-900' : 'text-gray-400'}`}>🇨🇿 Čeština</Link>
            <Link href={switchLanguage('en')} onClick={() => setIsMenuOpen(false)} className={`font-bold ${locale === 'en' ? 'text-blue-900' : 'text-gray-400'}`}>🇬🇧 English</Link>
          </div>

          <div className="px-2 pb-2 text-xs font-bold text-gray-400 uppercase tracking-wider">
            {t('destinations')}
          </div>
          <div className="space-y-1 max-h-[60vh] overflow-y-auto">
            {countries.map(country => (
              <Link 
                key={country.id} 
                href={`/${locale}/country/${country.id}`}
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