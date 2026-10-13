'use client';

import { useRouter, useSearchParams } from 'next/navigation';
import { resetFilterHref } from '@/lib/filterContext';

const labels: Record<string, string> = {
  cs: 'Reset filtrů',
  en: 'Reset filters',
  de: 'Filter zurücksetzen',
  fr: 'Réinitialiser les filtres',
  es: 'Restablecer filtros',
};

export default function ResetFilters({ locale }: { locale: string }) {
  const router = useRouter();
  const params = useSearchParams();
  return (
    <button
      type="button"
      onClick={() => router.push(resetFilterHref(locale, new URLSearchParams(params.toString()), window.location.hash))}
      className="h-10 w-full sm:w-auto shrink-0 rounded-xl px-3 text-xs sm:text-sm font-bold text-slate-300 hover:bg-white/5 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 cursor-pointer"
    >
      {Object.hasOwn(labels, locale) ? labels[locale] : labels.cs}
    </button>
  );
}
