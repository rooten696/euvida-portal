'use client';

import { useState, useRef, useEffect } from 'react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';

const CATEGORIES: { id: string; name: string; icon: string }[] = [
  { id: 'all',                name: 'Vše',                     icon: '✨' },
  { id: 'places',             name: 'Památky',                 icon: '🏰' },
  { id: 'camping',            name: 'Kemping',                 icon: '⛺' },
  { id: 'bike_trail',         name: 'Bike parky',              icon: '🚴' },
  { id: 'natural_swimming',   name: 'Přírodní koupání',        icon: '🏊' },
  { id: 'outdoor_pool',       name: 'Bazény a aquaparky',      icon: '🌊' },
  { id: 'trip',               name: 'Výlety',                  icon: '🥾' },
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

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const isHomepage = pathname === `/${locale}` || pathname === `/${locale}/` || pathname === '/' || pathname === '';
  const categoryParam = isHomepage ? searchParams.get('category') : null;
  const activeCategories = categoryParam ? categoryParam.split(',') : [];

  const handleToggleCategory = (categoryId: string) => {
    const params = new URLSearchParams(searchParams.toString());
    
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

  let activeIcon = '✨';
  let activeLabel = 'Vše';

  if (activeCategories.length === 1) {
    const activeOption = CATEGORIES.find(c => c.id === activeCategories[0]);
    if (activeOption) {
      activeIcon = activeOption.icon;
      activeLabel = activeOption.name;
    }
  } else if (activeCategories.length > 1) {
    activeIcon = '✔️';
    const labels = activeCategories.map(cId => {
      const option = CATEGORIES.find(c => c.id === cId);
      return option ? option.name : '';
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
                    <span className="truncate">{category.name}</span>
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
