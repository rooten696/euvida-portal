'use client';

import Image from 'next/image';
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
  flag: string; // Tady držíme emoji z databáze pro mobily
  translations?: Record<string, { name: string }>;
};

// PŘIDÁNO ZPĚT EMOJI: Pro mobilní zobrazení
const languages = [
  { code: 'cs', label: 'Čeština', flag: '🇨🇿' },
  { code: 'en', label: 'English', flag: '🇬🇧' },
  { code: 'de', label: 'Deutsch', flag: '🇩🇪' },
  { code: 'es', label: 'Español', flag: '🇪🇸' },
  { code: 'fr', label: 'Français', flag: '🇫🇷' }
];

export default function Navbar() {
  const [user, setUser] = useState<User | null>(null);
  const [countries, setCountries] = useState<Country[]>([]);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  
  const router = useRouter();
  const pathname = usePathname();

  const t = useTranslations('Navigation');
  const locale = useLocale();

  // Zámek scrollování pro mobilní menu
  useEffect(() => {
    if (isMenuOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [isMenuOpen]);

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
      // Stahujeme 'id' (pro SVG) i 'flag' (pro emoji na mobilu)
      const { data } = await supabase.from('countries').select('id, name, flag, translations');
      
      if (data) {
        const translatedData = data.map((country) => {
          const allTranslations = country.translations as Record<string, { name: string }> | null;
          const translation = allTranslations?.[locale];
          
          return {
            ...country,
            name: translation?.name || country.name
          };
        });

        // Abecední řazení podle aktuálního jazyka
        translatedData.sort((a, b) => a.name.localeCompare(b.name, locale));
        setCountries(translatedData);
      }
    };
    fetchCountries();
  }, [locale]);

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

            {/* DESKTOPOVÉ MENU ZEMÍ (Používá SVG obrázky podle ID) */}
            {isDropdownOpen && (
              <div className="absolute top-[calc(100%-1rem)] left-0 w-64 bg-white rounded-2xl shadow-xl border border-gray-100 py-2 overflow-y-auto max-h-[70vh] overscroll-contain animate-in fade-in slide-in-from-top-2 custom-scrollbar">
                {countries.map(country => (
                  <Link 
                    key={country.id} 
                    href={`/${locale}/country/${country.id}`}
                    className="flex items-center gap-3 px-4 py-3 text-sm text-gray-700 hover:bg-blue-50 hover:text-blue-900 font-bold transition-colors"
                    onClick={() => setIsDropdownOpen(false)}
                  >
                    <Image 
                      src={`/flags/${country.id.toLowerCase()}.svg`} 
                      alt={country.name} 
                      width={24} 
                      height={18} 
                      className="rounded-sm border border-gray-200 object-cover shadow-sm w-6 h-[18px] shrink-0"
                    />
                    <span>{country.name}</span>
                  </Link>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* PRAVÁ ČÁST: Přihlášení, tlačítka a přepínač jazyka */}
        <div className="flex items-center gap-4 md:gap-6">
          
          {/* DESKTOPOVÝ PŘEPÍNAČ JAZYKŮ (Používá SVG obrázky podle kódu jazyka) */}
          <div className="hidden md:flex items-center gap-2 bg-gray-50/80 p-1 rounded-full border border-gray-100">
            {languages.map(lang => (
              <Link
                key={lang.code}
                href={switchLanguage(lang.code)}
                title={lang.label}
                className={`w-8 h-8 flex items-center justify-center rounded-full transition-all overflow-hidden border-2
                  ${locale === lang.code 
                    ? 'border-blue-500 shadow-sm scale-110 grayscale-0' 
                    : 'border-transparent hover:border-blue-200 hover:scale-105 grayscale-[0.6] hover:opacity-100 hover:grayscale-0'}`}
              >
                <Image 
                  src={`/flags/${lang.code}.svg`} 
                  alt={lang.label} 
                  width={32} 
                  height={32} 
                  className="w-full h-full object-cover shrink-0"
                />
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

      {/* MOBILNÍ ROZBALOVACÍ MENU (Ukazuje krásné emoji) */}
      {isMenuOpen && (
        <div className="md:hidden bg-white border-t border-gray-100 px-4 pt-4 pb-6 shadow-xl absolute w-full left-0 top-full h-screen flex flex-col">
          
          {/* MOBILNÍ PŘEPÍNAČ JAZYKŮ (Emoji) */}
          <div className="flex justify-center gap-4 mb-4 pb-4 border-b border-gray-50 shrink-0">
            {languages.map(lang => (
              <Link
                key={lang.code}
                href={switchLanguage(lang.code)}
                onClick={() => setIsMenuOpen(false)}
                title={lang.label}
                className={`w-12 h-12 flex items-center justify-center rounded-full transition-all text-3xl
                  ${locale === lang.code 
                    ? 'bg-blue-50 shadow-inner scale-110 grayscale-0' 
                    : 'grayscale opacity-60 hover:opacity-100 hover:grayscale-0'}`}
              >
                {lang.flag}
              </Link>
            ))}
          </div>

          <div className="px-2 pb-2 text-xs font-bold text-gray-400 uppercase tracking-wider shrink-0">
            {t('destinations')}
          </div>
          
          {/* MOBILNÍ MENU ZEMÍ (Emoji) */}
          <div className="space-y-1 overflow-y-auto overscroll-contain flex-grow pb-32">
            {countries.map(country => (
              <Link 
                key={country.id} 
                href={`/${locale}/country/${country.id}`}
                onClick={() => setIsMenuOpen(false)}
                className="flex items-center gap-3 px-4 py-3 text-base font-bold text-gray-700 hover:bg-blue-50 hover:text-blue-900 rounded-xl transition-colors"
              >
                <span className="text-2xl drop-shadow-sm shrink-0 w-8 text-center">{country.flag}</span>
                <span>{country.name}</span>
              </Link>
            ))}
          </div>
        </div>
      )}
    </nav>
  );
}