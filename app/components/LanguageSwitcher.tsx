'use client';

import { usePathname, useRouter } from 'next/navigation';

export default function LanguageSwitcher({ currentLocale }: { currentLocale: string }) {
  const pathname = usePathname();
  const router = useRouter();

  const languages = [
    { code: 'cs', flag: '🇨🇿' },
    { code: 'en', flag: '🇬🇧' },
    { code: 'de', flag: '🇩🇪' },
    { code: 'es', flag: '🇪🇸' },
    { code: 'fr', flag: '🇫🇷' }
  ];

  const handleLanguageChange = (newLocale: string) => {
    // Nahradíme kód jazyka v URL (např. /cs/country/... za /es/country/...)
    const newPath = pathname.replace(`/${currentLocale}`, `/${newLocale}`);
    router.push(newPath);
  };

  return (
    <div className="flex gap-2 bg-white/20 backdrop-blur-md p-1 rounded-full border border-white/30">
      {languages.map((lang) => (
        <button
          key={lang.code}
          onClick={() => handleLanguageChange(lang.code)}
          className={`w-8 h-8 flex items-center justify-center rounded-full transition-all text-lg
            ${currentLocale === lang.code 
              ? 'bg-white shadow-md scale-110' 
              : 'hover:bg-white/40 grayscale-[0.5] hover:grayscale-0'
            }`}
          title={lang.code.toUpperCase()}
        >
          {lang.flag}
        </button>
      ))}
    </div>
  );
}