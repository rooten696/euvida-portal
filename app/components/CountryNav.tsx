'use client';

import { useState, useRef, useEffect, useMemo } from 'react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import Image from 'next/image';
import { supabase } from '@/lib/supabaseBrowserClient';

type Country = {
  id: string;
  name: string;
  flag: string;
};

interface CountryNavProps {
  locale: string;
  countries: Country[];
}

export default function CountryNav({ locale, countries }: CountryNavProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  
  const dropdownRef = useRef<HTMLDivElement>(null);
  const [isOpen, setIsOpen] = useState(false);
  const [resolvedPathCountryId, setResolvedPathCountryId] = useState<string | null>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Rozpoznání aktivní země z cesty (stejně jako v HeaderCountryDropdown)
  useEffect(() => {
    const segments = pathname.split('/').filter(Boolean);
    const langIdx = segments.length > 0 && segments[0].length === 2 ? 1 : 0;
    const typeSegment = segments[langIdx];
    const idSegment = segments[langIdx + 1];

    if (typeSegment === 'country' && idSegment) {
      setResolvedPathCountryId(idSegment.toUpperCase());
    } else if (typeSegment === 'region' && idSegment) {
      const fetchRegionCountry = async () => {
        try {
          const { data } = await supabase
            .from('regions')
            .select('country_id')
            .eq('id', idSegment)
            .maybeSingle();
          if (data?.country_id) {
            setResolvedPathCountryId(data.country_id.toUpperCase());
          } else {
            setResolvedPathCountryId(null);
          }
        } catch {
          setResolvedPathCountryId(null);
        }
      };
      fetchRegionCountry();
    } else {
      setResolvedPathCountryId(null);
    }
  }, [pathname]);

  const countryParam = searchParams.get('country') || '';
  
  const activeCountries = useMemo(() => {
    if (countryParam) {
      return countryParam.split(',').map(c => c.toUpperCase());
    }
    if (resolvedPathCountryId) {
      return [resolvedPathCountryId];
    }
    return [];
  }, [countryParam, resolvedPathCountryId]);

  const handleToggleCountry = (countryId: string) => {
    const params = new URLSearchParams(searchParams.toString());
    
    if (countryId === 'all') {
      params.delete('country');
    } else {
      let newCountries = [...activeCountries].filter(c => c !== 'all');
      
      if (newCountries.includes(countryId)) {
        newCountries = newCountries.filter(c => c !== countryId);
      } else {
        newCountries.push(countryId);
      }
      
      if (newCountries.length === 0) {
        params.delete('country');
      } else {
        params.set('country', newCountries.join(','));
      }
    }
    
    const queryString = params.toString() ? `?${params.toString()}` : '';
    router.push(`/${locale}${queryString}`);
  };

  let activeIcon = '🌍';
  let activeLabel = 'Všechny země'; 

  if (activeCountries.length === 1) {
    const activeOption = countries.find(c => c.id === activeCountries[0]);
    if (activeOption) {
      activeIcon = activeOption.flag || '🌍';
      activeLabel = activeOption.name;
    }
  } else if (activeCountries.length > 1) {
    activeIcon = '✔️';
    const labels = activeCountries.map(cId => {
      const option = countries.find(c => c.id === cId);
      return option ? option.name : '';
    });
    activeLabel = labels.filter(Boolean).join(', ');
  }

  const allCountriesOption = { id: 'all', name: 'Všechny země', flag: '🌍' };
  const displayCountries = [allCountriesOption, ...countries];

  return (
    <div className="relative inline-block text-left w-full sm:w-[320px]" ref={dropdownRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-full flex items-center justify-between gap-2 px-3 py-2 bg-transparent hover:bg-white/5 rounded-xl text-xs sm:text-sm font-bold text-slate-200 hover:text-white transition-all cursor-pointer"
      >
        <span className="flex items-center gap-2 truncate">
          <span className="shrink-0 text-lg flex items-center">
            {activeCountries.length === 1 && activeCountries[0] !== 'all' ? (
              <Image 
                src={`/flags/${activeCountries[0].toLowerCase()}.svg`} 
                alt="" 
                width={24} 
                height={18} 
                className="rounded-sm border border-white/10 object-cover shadow-sm w-6 h-[18px]"
              />
            ) : (
              activeIcon
            )}
          </span>
          <span className="truncate">{activeLabel}</span>
        </span>
        <svg
          className={`w-4 h-4 text-slate-400 transition-transform duration-200 shrink-0 ${isOpen ? 'rotate-180' : ''}`}
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {isOpen && (
        <div className="absolute left-0 sm:left-auto sm:right-0 mt-2 w-full sm:w-[320px] origin-top rounded-xl bg-slate-900 border border-white/10 shadow-2xl backdrop-blur-md z-50 p-1.5 animate-in fade-in slide-in-from-top-2 duration-200">
          <div className="flex flex-col gap-1 max-h-[60vh] overflow-y-auto custom-scrollbar pr-1">
            {displayCountries.map((country) => {
              const isSelected = activeCountries.includes(country.id) || (country.id === 'all' && activeCountries.length === 0);

              return (
                <button
                  key={country.id}
                  onClick={() => handleToggleCountry(country.id)}
                  className="w-full flex items-center justify-between gap-2.5 px-2.5 py-2 rounded-lg text-xs sm:text-sm font-bold text-slate-300 hover:text-white hover:bg-white/5 transition-all text-left cursor-pointer"
                >
                  <span className="flex items-center gap-2.5 truncate">
                    <span className="text-lg shrink-0 flex items-center">
                      {country.id === 'all' ? (
                        country.flag
                      ) : (
                        <Image 
                          src={`/flags/${country.id.toLowerCase()}.svg`} 
                          alt={country.name} 
                          width={24} 
                          height={18} 
                          className="rounded-sm border border-white/10 object-cover shadow-sm w-6 h-[18px]"
                        />
                      )}
                    </span>
                    <span className="truncate">{country.name}</span>
                  </span>

                  {/* Custom Checkbox */}
                  <div className={`w-4 h-4 rounded border flex items-center justify-center shrink-0 transition-all ${
                    isSelected
                      ? 'bg-emerald-500 border-emerald-500 text-slate-950'
                      : 'border-white/20 text-transparent'
                  }`}>
                    <svg className="w-2.5 h-2.5 fill-current" viewBox="0 0 20 20">
                      <path d="M0 11l2-2 5 5L18 3l2 2L7 18z" />
                    </svg>
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
