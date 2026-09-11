'use client';

import { useState, useRef, useEffect, useMemo } from 'react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { supabase } from '@/lib/supabaseBrowserClient';

const CATEGORIES: { id: string; name: Record<string, string>; icon: string }[] = [
  {
    id: 'all',
    name: {
      cs: 'Všechny bikeparky',
      en: 'All bike parks',
      de: 'Alle Bikeparks',
      fr: 'Tous les bike parks',
      es: 'Todos los bike parks',
    },
    icon: '🚵',
  },
  {
    id: 'lift',
    name: {
      cs: 'Lanovky & vleky',
      en: 'Lifts & shuttles',
      de: 'Bergbahnen & Lifte',
      fr: 'Remontées & navettes',
      es: 'Remontes y shuttles',
    },
    icon: '🚡',
  },
  {
    id: 'beginner',
    name: {
      cs: 'Pro začátečníky & rodiny',
      en: 'Kids & beginners',
      de: 'Anfänger & Familien',
      fr: 'Débutants & familles',
      es: 'Principiantes y familias',
    },
    icon: '🟢',
  },
  {
    id: 'rental',
    name: {
      cs: 'Půjčovna & servis',
      en: 'Rental & workshop',
      de: 'Verleih & Werkstatt',
      fr: 'Location & atelier',
      es: 'Alquiler y taller',
    },
    icon: '🔧',
  },
  {
    id: 'trail_map',
    name: {
      cs: 'S mapou trailů',
      en: 'With trail map',
      de: 'Mit Trailkarte',
      fr: 'Avec plan des pistes',
      es: 'Con mapa de pistas',
    },
    icon: '🗺️',
  },
];

interface ArticleCategoryNavProps {
  locale: string;
}

export default function ArticleCategoryNav({ locale }: ArticleCategoryNavProps) {
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

  // Rozpoznání aktivní země z cesty (stejně jako v CountryNav a HeaderCountryDropdown)
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

  const categoryParam = searchParams.get('category') || '';
  const activeCategories = categoryParam ? categoryParam.split(',') : [];

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

  const getCategoryName = (c: typeof CATEGORIES[number]) => c.name[locale] || c.name.cs;

  const handleToggleCategory = (categoryId: string) => {
    const params = new URLSearchParams(searchParams.toString());
    
    // Zachování zástupného filtrování zemí z cesty
    if (activeCountries.length > 0 && !params.has('country')) {
      params.set('country', activeCountries.join(','));
    }

    if (categoryId === 'all') {
      params.delete('category');
    } else {
      let newCategories = [...activeCategories].filter(c => c !== 'all');
      
      if (newCategories.includes(categoryId)) {
        newCategories = newCategories.filter(c => c !== categoryId);
      } else {
        newCategories.push(categoryId);
      }
      
      if (newCategories.length === 0) {
        params.delete('category');
      } else {
        params.set('category', newCategories.join(','));
      }
    }
    
    const queryString = params.toString() ? `?${params.toString()}` : '';
    router.push(`/${locale}${queryString}`);
  };

  let activeIcon = '🚵';
  let activeLabel = CATEGORIES[0].name[locale] || 'Všechny bikeparky';

  if (activeCategories.length === 1) {
    const activeOption = CATEGORIES.find(c => c.id === activeCategories[0]);
    if (activeOption) {
      activeIcon = activeOption.icon;
      activeLabel = getCategoryName(activeOption);
    }
  } else if (activeCategories.length > 1) {
    activeIcon = '✔️';
    const labels = activeCategories.map(cId => {
      const option = CATEGORIES.find(c => c.id === cId);
      return option ? getCategoryName(option) : '';
    });
    activeLabel = labels.filter(Boolean).join(', ');
  }

  return (
    <div className="relative inline-block text-left w-full sm:w-[320px]" ref={dropdownRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-full flex items-center justify-between gap-2 px-3 py-2 bg-transparent hover:bg-white/5 rounded-xl text-xs sm:text-sm font-bold text-slate-200 hover:text-white transition-all cursor-pointer"
      >
        <span className="flex items-center gap-2 truncate">
          <span className="shrink-0 text-lg">{activeIcon}</span>
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
        <div className="absolute left-0 mt-2 w-full sm:w-[320px] origin-top rounded-xl bg-slate-900 border border-white/10 shadow-2xl backdrop-blur-md z-50 p-1.5 animate-in fade-in slide-in-from-top-2 duration-200">
          <div className="flex flex-col gap-1 max-h-[60vh] overflow-y-auto custom-scrollbar pr-1">
            {CATEGORIES.map((category) => {
              const isSelected = activeCategories.includes(category.id) || (category.id === 'all' && activeCategories.length === 0);

              return (
                <button
                  key={category.id}
                  onClick={() => handleToggleCategory(category.id)}
                  className="w-full flex items-center justify-between gap-2.5 px-2.5 py-2 rounded-lg text-xs sm:text-sm font-bold text-slate-300 hover:text-white hover:bg-white/5 transition-all text-left cursor-pointer"
                >
                  <span className="flex items-center gap-2.5 truncate">
                    <span className="text-lg shrink-0">{category.icon}</span>
                    <span className="truncate">{getCategoryName(category)}</span>
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
