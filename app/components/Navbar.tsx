'use client';

import Link from 'next/link';
import { createClient, User } from '@supabase/supabase-js';
import { useEffect, useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';
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

// Seznam našich 5 jazyků pro rychlé vykreslení
const languages = [
  { code: 'cs', flag: '🇨🇿', label: 'Čeština' },
  { code: 'en', flag: '🇬🇧', label: 'English' },
  { code: 'de', flag: '🇩🇪', label: 'Deutsch' },
  { code: 'es', flag: '🇪🇸', label: 'Español' },
  { code: 'fr', flag: '🇫🇷', label: 'Français' }
];

export default function Navbar() {
  // Správně typovaný uživatel bez "any"
  const [user, setUser] = useState<User | null>(null);
  const [countries, setCountries] = useState<Country[]>([]);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  
  const router = useRouter();
  const pathname = usePathname();

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
    router.push(`/${locale}`);
  };

  if (pathname.includes('/admin')) {
    return null;
  }

  const switchLanguage = (newLocale: string) => {
    if (!pathname) return `/${newLocale}`;
    return pathname.replace(`/${locale}`, `/${newLocale}`);
  };

  return (
    <nav className="bg-white/90 backdrop-blur-md border-b border-gray-100 shadow-sm sticky top-0 z-50 transition-all">
      <div className="max-w-6xl mx-auto px-4 py-4 flex justify-between items-center">
        
        {/* LEVÁ ČÁST: Logo a Menu destinací */}
        <div className="flex items-center gap-8">
          <Link href={`/${locale}`} className="text-2xl font-extrabold text-blue-900 tracking-tighter hover:opacity-80 transition-opacity">
            EUVIDA<span className="text-yellow-400">.</span>
          </Link>

          <div className="hidden md:block relative" onMouseLeave={() => setIsDropdownOpen(false)}>
            <button 
              onMouseEnter={() => setIsDropdownOpen(true)}
              className="text-gray-600 hover:text-blue-900 font-bold transition-colors flex items-center gap-1 pb-4"
            >
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
          
          {/* NOVÝ PĚTIJAZYČNÝ PŘEPÍNAČ PRO DESKTOP */}
          <div className="hidden sm:flex items-center gap-1 bg-gray-50/80 p-1 rounded-full border border-gray-100">
            {languages.map(lang => (
              <Link
                key={lang.code}
                href={switchLanguage(lang.code)}
                title={lang.label}
                className={`w-8 h-8 flex items-center justify-center rounded-full transition-all text-lg
                  ${locale === lang.code 
                    ? 'bg-white shadow-sm scale-110 grayscale-0' 
                    : 'hover:bg-white/60 hover:scale-105 grayscale opacity-60 hover:opacity-100 hover:grayscale-0'}`}
              >
                {lang.flag}
              </Link>
            ))}
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
          
          {/* MOBILNÍ PŘEPÍNAČ JAZYKŮ */}
          <div className="flex justify-center gap-3 mb-4 pb-4 border-b border-gray-50">
            {languages.map(lang => (
              <Link
                key={lang.code}
                href={switchLanguage(lang.code)}
                onClick={() => setIsMenuOpen(false)}
                title={lang.label}
                className={`w-10 h-10 flex items-center justify-center rounded-full transition-all text-2xl
                  ${locale === lang.code 
                    ? 'bg-blue-50 shadow-inner grayscale-0 scale-110' 
                    : 'grayscale opacity-60 hover:opacity-100 hover:grayscale-0'}`}
              >
                {lang.flag}
              </Link>
            ))}
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