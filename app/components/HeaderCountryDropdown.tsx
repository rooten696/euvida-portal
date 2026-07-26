'use client';

import { useState, useRef, useEffect } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import Image from 'next/image';
import { supabase } from '@/lib/supabaseBrowserClient';

type Country = {
  id: string;
  name: string;
  flag: string;
};

interface HeaderCountryDropdownProps {
  locale: string;
  countries: Country[];
}

export default function HeaderCountryDropdown({ locale, countries }: HeaderCountryDropdownProps) {
  const router = useRouter();
  const pathname = usePathname();
  
  const dropdownRef = useRef<HTMLDivElement>(null);
  const [isOpen, setIsOpen] = useState(false);
  const [activeCountryId, setActiveCountryId] = useState<string | null>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Rozpoznání aktivní země z adresy (buď přímo /country/XYZ nebo z regionu patřícího pod XYZ)
  useEffect(() => {
    const segments = pathname.split('/').filter(Boolean);
    // V Next.js locale bývá první segment (např. cs)
    const langIdx = segments.length > 0 && segments[0].length === 2 ? 1 : 0;
    const typeSegment = segments[langIdx];
    const idSegment = segments[langIdx + 1];

    if (typeSegment === 'country' && idSegment) {
      setActiveCountryId(idSegment.toUpperCase());
    } else if (typeSegment === 'region' && idSegment) {
      const fetchRegionCountry = async () => {
        try {
          const { data } = await supabase
            .from('regions')
            .select('country_id')
            .eq('id', idSegment)
            .maybeSingle();
          if (data?.country_id) {
            setActiveCountryId(data.country_id.toUpperCase());
          } else {
            setActiveCountryId(null);
          }
        } catch {
          setActiveCountryId(null);
        }
      };
      fetchRegionCountry();
    } else {
      setActiveCountryId(null);
    }
  }, [pathname]);

  const activeCountry = countries.find(c => c.id === activeCountryId);

  const handleSelectCountry = (countryId: string) => {
    if (countryId === 'all') {
      router.push(`/${locale}/countries`);
    } else {
      router.push(`/${locale}/country/${countryId}`);
    }
    setIsOpen(false);
  };

  const labelText = locale === 'cs' ? 'Země' : (locale === 'de' ? 'Länder' : 'Countries');

  return (
    <div className="relative inline-block text-left" ref={dropdownRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 px-3 py-1.5 bg-transparent hover:bg-white/5 rounded-xl text-sm font-semibold text-slate-300 hover:text-emerald-400 transition-all cursor-pointer"
      >
        <span className="flex items-center gap-1.5">
          <span className="shrink-0 text-base flex items-center">
            {activeCountry ? (
              <Image 
                src={`/flags/${activeCountry.id.toLowerCase()}.svg`} 
                alt="" 
                width={20} 
                height={15} 
                className="rounded-sm border border-white/10 object-cover shadow-sm w-5 h-[15px]"
              />
            ) : (
              '🌍'
            )}
          </span>
          <span className="max-w-[120px] truncate">{activeCountry ? activeCountry.name : labelText}</span>
        </span>
        <svg
          className={`w-3.5 h-3.5 text-slate-400 transition-transform duration-200 shrink-0 ${isOpen ? 'rotate-180' : ''}`}
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {isOpen && (
        <div className="absolute left-0 mt-2 w-[220px] origin-top-left rounded-xl bg-slate-900 border border-white/10 shadow-2xl backdrop-blur-md z-50 p-1.5 animate-in fade-in slide-in-from-top-2 duration-200">
          <div className="flex flex-col gap-0.5 max-h-[50vh] overflow-y-auto custom-scrollbar pr-0.5">
            {/* Všechny země */}
            <button
              onClick={() => handleSelectCountry('all')}
              className={`w-full flex items-center gap-2 px-2.5 py-2 rounded-lg text-xs font-bold transition-all text-left cursor-pointer ${
                !activeCountryId 
                  ? 'bg-emerald-500/10 text-emerald-400' 
                  : 'text-slate-300 hover:text-white hover:bg-white/5'
              }`}
            >
              <span className="text-base shrink-0 flex items-center">🌍</span>
              <span>{locale === 'cs' ? 'Všechny země' : 'All countries'}</span>
            </button>

            {countries.map((country) => {
              const isActive = country.id === activeCountryId;
              return (
                <button
                  key={country.id}
                  onClick={() => handleSelectCountry(country.id)}
                  className={`w-full flex items-center gap-2 px-2.5 py-2 rounded-lg text-xs font-bold transition-all text-left cursor-pointer ${
                    isActive 
                      ? 'bg-emerald-500/10 text-emerald-400' 
                      : 'text-slate-300 hover:text-white hover:bg-white/5'
                  }`}
                >
                  <span className="text-base shrink-0 flex items-center">
                    <Image 
                      src={`/flags/${country.id.toLowerCase()}.svg`} 
                      alt={country.name} 
                      width={20} 
                      height={15} 
                      className="rounded-sm border border-white/10 object-cover shadow-sm w-5 h-[15px]"
                    />
                  </span>
                  <span className="truncate">{country.name}</span>
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
