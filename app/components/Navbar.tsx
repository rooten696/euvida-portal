'use client';

import { supabase } from '@/lib/supabaseBrowserClient';
import Image from 'next/image';
import Link from 'next/link';
import FilterContextLink from './FilterContextLink';
import type { User } from '@supabase/supabase-js';
import { useEffect, useState, Suspense } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { useTranslations, useLocale } from 'next-intl';
import ThemeSwitcher from './ThemeSwitcher';
import CountryNav from './CountryNav';
import ArticleCategoryNav from './ArticleCategoryNav';
import ResetFilters from './ResetFilters';
import HeaderCountryDropdown from './HeaderCountryDropdown';
import HideOnScrollHeader from './HideOnScrollHeader';

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

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      setUser(session?.user ?? null);
      if (event === 'SIGNED_IN' || event === 'SIGNED_OUT') {
        router.refresh();
      }
    });

    return () => subscription.unsubscribe();
  }, [router]);

  useEffect(() => {
    const fetchCountries = async () => {
      // Stahujeme 'id' (pro SVG) i 'flag' (pro emoji na mobilu)
      const language = ['cs', 'en', 'de', 'fr', 'es'].includes(locale) ? locale : 'cs';
      const { data } = await supabase.from('countries').select(`id, name, flag, localized_name:translations->${language}->>name`);
      
      if (data) {
        const translatedData = (data as unknown as Array<Country & { localized_name?: string }>).map((country) => {
          return {
            id: country.id,
            flag: country.flag,
            name: country.localized_name || country.name
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

  const switchLanguage = (newLocale: string) => {
    if (!pathname) return `/${newLocale}`;
    return pathname.replace(`/${locale}`, `/${newLocale}`);
  };

  return (
    <HideOnScrollHeader
      forceVisible={isMenuOpen}
      className="sticky top-0 z-50 w-full shrink-0 border-b border-white/5 bg-slate-950/80 backdrop-blur-md"
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-20 flex justify-between items-center">
        
        {/* LEVÁ ČÁST: Logo a výběr obecných info o státech */}
        <div className="flex items-center gap-3 lg:gap-5">
          <FilterContextLink href={`/${locale}`} className="text-2xl font-extrabold text-white tracking-tighter hover:opacity-80 transition-opacity flex items-center shrink-0">
            EU<span className="text-emerald-400 transition-colors duration-200">VIDA</span><span className="text-xs text-emerald-500 font-bold bg-emerald-500/10 border border-emerald-500/20 px-1.5 py-0.5 rounded ml-1">.EU</span>
          </FilterContextLink>
          <div className="hidden md:flex items-center gap-2">
            <HeaderCountryDropdown locale={locale} countries={countries} />
            <Link
              href={`/${locale}/letenky`}
              className={`group flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-sm font-semibold whitespace-nowrap transition-all duration-200 motion-reduce:transition-none ${
                pathname && (
                  pathname === `/${locale}/letenky` ||
                  pathname.startsWith(`/${locale}/letenky/`) ||
                  pathname === `/${locale}/flights` ||
                  pathname.startsWith(`/${locale}/flights/`)
                )
                  ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 shadow-sm shadow-emerald-950/40'
                  : 'bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/20 hover:text-emerald-300 border border-emerald-500/20 hover:border-emerald-500/40 shadow-sm'
              }`}
            >
              <svg
                aria-hidden="true"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                className="w-4 h-4 shrink-0 transition-transform duration-200 group-hover:-translate-y-0.5 group-hover:translate-x-0.5 motion-reduce:group-hover:translate-none"
              >
                <path d="M17.8 19.2 16 11l3.5-3.5C21 6 21.5 4 21 3c-1-.5-3 0-4.5 1.5L13 8 4.8 6.2c-.5-.1-.9.1-1.1.5l-.3.5c-.2.5-.1 1 .3 1.3L9 12l-2 3H4l-1 1 3 2 2 3 1-1v-3l3-2 3.5 5.3c.3.4.8.5 1.3.3l.5-.2c.4-.3.6-.7.5-1.2z" />
              </svg>
              <span>{t('flights')}</span>
            </Link>
          </div>
        </div>

        {/* STŘEDNÍ ČÁST: Hlavní navigace (Desktop) */}
        <nav className="hidden lg:flex items-center gap-4 xl:gap-8 text-sm font-medium text-slate-300 whitespace-nowrap">
          <FilterContextLink href={`/${locale}`} className="hover:text-emerald-400 transition-colors duration-150">
            {t('home')}
          </FilterContextLink>
          <FilterContextLink href={`/${locale}#countries`} className="hover:text-emerald-400 transition-colors duration-150">
            {t('countries')}
          </FilterContextLink>
          <FilterContextLink href={`/${locale}#articles`} className="hover:text-emerald-400 transition-colors duration-150">
            {t('articles')}
          </FilterContextLink>
          <Link href={`/${locale}/about`} className="hover:text-emerald-400 transition-colors duration-150">
            {t('about')}
          </Link>
        </nav>

        {/* PRAVÁ ČÁST: Přihlášení, tlačítka a přepínač jazyka */}
        <div className="flex items-center gap-3 lg:gap-4 xl:gap-6">
          
          <ThemeSwitcher />

          {/* DESKTOPOVÝ PŘEPÍNAČ JAZYKŮ (Používá SVG obrázky podle kódu jazyka) */}
          <div className="hidden lg:flex items-center gap-1.5 xl:gap-2 bg-slate-900/80 p-1 rounded-full border border-white/10 shrink-0">
            {languages.map(lang => (
              <Link
                key={lang.code}
                href={switchLanguage(lang.code)}
                title={lang.label}
                className={`w-7 h-7 xl:w-8 xl:h-8 flex items-center justify-center rounded-full transition-all overflow-hidden border-2
                  ${locale === lang.code 
                    ? 'border-emerald-500 shadow-sm scale-110 grayscale-0' 
                    : 'border-transparent hover:border-emerald-500/50 hover:scale-105 grayscale-[0.6] hover:opacity-100 hover:grayscale-0'}`}
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
              <Link href={`/${locale}/oblibene`} className="text-slate-300 hover:text-red-400 font-bold flex items-center gap-1 transition-colors text-sm md:text-base">
                <span className="text-red-500">❤️</span> <span className="hidden sm:inline">{t('favorites')}</span>
              </Link>

              <Link href={`/${locale}/profile`} className="text-slate-300 hover:text-emerald-400 font-bold transition-colors text-sm md:text-base">
                {t('profile')}
              </Link>
              
              <Link href={`/${locale}/profile`} className="hidden md:block text-xs font-medium text-slate-400 bg-white/5 px-3 py-1 rounded-full border border-white/10 hover:text-emerald-400 hover:border-emerald-500/30 transition-colors">
                {user.email}
              </Link>
              
              <button onClick={handleLogout} className="bg-white/10 text-white px-4 py-2 rounded-xl text-sm font-bold hover:bg-white/20 transition-colors">
                {t('logout')}
              </button>
            </>
          ) : (
            <Link href={`/${locale}/login`} className="bg-emerald-500 text-slate-950 px-5 lg:px-6 py-2 rounded-xl text-sm font-bold hover:bg-emerald-400 transition-all shadow-md hover:shadow-lg whitespace-nowrap">
              {t('login')}
            </Link>
          )}

          <button 
            className="lg:hidden text-slate-300 text-2xl w-8 text-center" 
            onClick={() => setIsMenuOpen(!isMenuOpen)}
          >
            {isMenuOpen ? '✖' : '☰'}
          </button>
        </div>
        
      </div>

      {/* MOBILNÍ ROZBALOVACÍ MENU (Ukazuje krásné emoji) */}
      {isMenuOpen && (
        <div className="md:hidden bg-slate-950 border-t border-white/10 px-4 pt-4 pb-6 shadow-xl absolute w-full left-0 top-full h-screen flex flex-col">
          
          {/* MOBILNÍ PŘEPÍNAČ JAZYKŮ (Emoji) */}
          <div className="flex justify-center gap-4 mb-4 pb-4 border-b border-white/5 shrink-0">
            {languages.map(lang => (
              <Link
                key={lang.code}
                href={switchLanguage(lang.code)}
                onClick={() => setIsMenuOpen(false)}
                title={lang.label}
                className={`w-12 h-12 flex items-center justify-center rounded-full transition-all text-3xl
                  ${locale === lang.code 
                    ? 'bg-emerald-500/10 shadow-inner scale-110 grayscale-0' 
                    : 'grayscale opacity-60 hover:opacity-100 hover:grayscale-0'}`}
              >
                {lang.flag}
              </Link>
            ))}
          </div>

          {/* RYCHLÉ ODKAZY NA MOBILU */}
          <div className="grid grid-cols-2 gap-2 mb-4 pb-4 border-b border-white/5 shrink-0">
            <FilterContextLink
              href={`/${locale}`}
              onClick={() => setIsMenuOpen(false)}
              className="px-3 py-2 text-sm font-semibold text-slate-300 hover:text-emerald-400 hover:bg-white/5 rounded-xl transition-colors text-center"
            >
              {t('home')}
            </FilterContextLink>
            <Link
              href={`/${locale}/letenky`}
              onClick={() => setIsMenuOpen(false)}
              className="px-3 py-2 text-sm font-semibold bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/20 border border-emerald-500/25 rounded-xl transition-colors text-center flex items-center justify-center gap-1.5"
            >
              <span>✈️</span> {t('flights')}
            </Link>
          </div>

          <div className="px-2 pb-2 text-xs font-bold text-slate-400 uppercase tracking-wider shrink-0">
            {t('destinations')}
          </div>
          
          {/* MOBILNÍ MENU ZEMÍ (Emoji) */}
          <div className="space-y-1 overflow-y-auto overscroll-contain flex-grow pb-32">
            {countries.map(country => (
              <Link 
                key={country.id} 
                href={`/${locale}/country/${country.id}`}
                onClick={() => setIsMenuOpen(false)}
                className="flex items-center gap-3 px-4 py-3 text-base font-bold text-slate-300 hover:bg-white/5 hover:text-emerald-400 rounded-xl transition-colors"
              >
                <span className="text-2xl drop-shadow-sm shrink-0 w-8 text-center">{country.flag}</span>
                <span>{country.name}</span>
              </Link>
            ))}
          </div>
        </div>
      )}

      {/* SUB-BAR Z EUVIDA.CZ STYLU */}
      <div className="border-t border-white/5 bg-slate-950/40 py-2.5">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex items-center justify-center">
          <div className="flex flex-col sm:flex-row items-center gap-2 sm:gap-0 bg-slate-900/90 border border-white/10 rounded-2xl p-1.5 shadow-xl max-w-4xl w-full sm:w-auto z-40">
            <Suspense fallback={<div className="h-10 w-full sm:w-[320px] bg-slate-900/50 animate-pulse rounded-xl" />}>
              <ArticleCategoryNav locale={locale} />
            </Suspense>
            <div className="h-6 w-[1px] bg-white/10 shrink-0 hidden sm:block mx-1.5" />
            <Suspense fallback={<div className="h-10 w-full sm:w-[320px] bg-slate-900/50 animate-pulse rounded-xl" />}>
              <CountryNav locale={locale} countries={countries} />
            </Suspense>
            <Suspense fallback={<div className="h-10 w-full sm:w-32" />}>
              <ResetFilters locale={locale} />
            </Suspense>
          </div>
        </div>
      </div>
    </HideOnScrollHeader>
  );
}
