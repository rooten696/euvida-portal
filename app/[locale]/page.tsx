import Link from 'next/link';
import { createClient } from '@supabase/supabase-js';
import { getTranslations } from 'next-intl/server';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

export const revalidate = 3600; 

export default async function HomePage({
  params
}: {
  params: Promise<{ locale: string }>
}) {
  const resolvedParams = await params;
  const locale = resolvedParams.locale;

  const t = await getTranslations('HomePage');

  // 1. ČISTÝ DOTAZ NA SUPABASE (stáhne vše včetně JSONu translations)
  const { data: countries } = await supabase
    .from('countries')
    .select('id, name, flag, description, image_url, translations')
    .order('name');

  // 2. KOUZLO S PŘEKLADY (přepíše texty, pokud existují v JSONu)
  const translatedCountries = countries?.map((country) => {
    // Striktní typování pro TypeScript, abychom nepoužívali 'any'
    type TranslationData = Record<string, { name: string; description: string }>;
    
    // Bezpečné načtení dat z JSONu
    const allTranslations = country.translations as TranslationData | null;
    const translation = allTranslations?.[locale];

    return {
      ...country,
      name: translation?.name || country.name,
      description: translation?.description || country.description
    };
  });

  return (
    <main className="min-h-screen bg-gray-50 text-gray-900 font-sans pb-20">
      
      {/* 1. HERO SEKCE */}
      <section className="relative h-[75vh] flex items-center justify-center overflow-hidden">
        <div className="absolute inset-0 z-0">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="https://images.unsplash.com/photo-1469854523086-cc02fe5d8800?q=80&w=2021&auto=format&fit=crop"
            alt="Krásy Evropy"
            className="w-full h-full object-cover"
          />
          <div className="absolute inset-0 bg-blue-900/40 mix-blend-multiply" />
          <div className="absolute inset-0 bg-gradient-to-t from-gray-50 via-transparent to-transparent" />
        </div>

        <div className="relative z-10 text-center px-4 max-w-4xl mx-auto mt-16">
          <h1 className="text-5xl md:text-7xl font-extrabold text-white mb-6 drop-shadow-xl tracking-tight">
            {t('title')}
          </h1>
          <p className="text-xl md:text-2xl text-white/95 mb-10 font-medium drop-shadow-lg max-w-2xl mx-auto">
            {t('subtitle')}
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <a href="#destinace" className="bg-yellow-400 text-yellow-900 px-8 py-4 rounded-full font-extrabold text-lg hover:bg-yellow-300 transition-all shadow-lg hover:shadow-2xl hover:-translate-y-1">
              {t('cta')}
            </a>
          </div>
        </div>
      </section>

      {/* 2. PROČ EUVIDA */}
      <section className="max-w-6xl mx-auto px-4 py-8 -mt-24 relative z-20">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="bg-white/95 backdrop-blur-sm p-8 rounded-3xl shadow-xl shadow-blue-900/10 border border-gray-100 flex flex-col items-center text-center hover:-translate-y-2 transition-transform duration-300">
            <div className="w-16 h-16 bg-blue-50 text-blue-600 rounded-2xl flex items-center justify-center text-3xl mb-6 shadow-inner">✈️</div>
            <h3 className="text-xl font-bold text-gray-900 mb-3">Cestování bez chyb</h3>
            <p className="text-gray-600 leading-relaxed">Autentické tipy na místa, která musíte vidět, a praktické rady pro dokonalou dovolenou bez stresu.</p>
          </div>
          <div className="bg-white/95 backdrop-blur-sm p-8 rounded-3xl shadow-xl shadow-blue-900/10 border border-gray-100 flex flex-col items-center text-center hover:-translate-y-2 transition-transform duration-300 delay-100">
            <div className="w-16 h-16 bg-green-50 text-green-600 rounded-2xl flex items-center justify-center text-3xl mb-6 shadow-inner">💼</div>
            <h3 className="text-xl font-bold text-gray-900 mb-3">Život a práce</h3>
            <p className="text-gray-600 leading-relaxed">Láká vás stěhování? Zjistěte vše o kultuře, bydlení a pracovních příležitostech v cizině.</p>
          </div>
          <div className="bg-white/95 backdrop-blur-sm p-8 rounded-3xl shadow-xl shadow-blue-900/10 border border-gray-100 flex flex-col items-center text-center hover:-translate-y-2 transition-transform duration-300 delay-200">
            <div className="w-16 h-16 bg-orange-50 text-orange-600 rounded-2xl flex items-center justify-center text-3xl mb-6 shadow-inner">🍷</div>
            <h3 className="text-xl font-bold text-gray-900 mb-3">Kultura a chuť</h3>
            <p className="text-gray-600 leading-relaxed">Od španělských tapas po belgické pralinky. Ponořte se naplno do lokální gastronomie a zvyků.</p>
          </div>
        </div>
      </section>

      {/* 3. VÝPIS ZEMÍ */}
      <section id="destinace" className="max-w-6xl mx-auto px-4 py-20 scroll-mt-24">
        <div className="text-center mb-16">
          <h2 className="text-4xl md:text-5xl font-extrabold text-blue-900 mb-4">{t('where_to')}</h2>
          <p className="text-lg text-gray-500 max-w-2xl mx-auto">Vyberte si zemi a prozkoumejte její unikátní regiony, památky a aktuální počasí.</p>
        </div>

        {/* POZOR ZMĚNA: Tady už nevykreslujeme 'countries', ale naše nové 'translatedCountries' */}
        {translatedCountries && translatedCountries.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8">
            {translatedCountries.map((country) => (
              <Link href={`/${locale}/country/${country.id}`} key={country.id} className="group rounded-3xl bg-white overflow-hidden shadow-sm hover:shadow-2xl hover:shadow-blue-900/10 border border-gray-100 transition-all duration-300 hover:-translate-y-2 flex flex-col">
                <div className="h-64 relative overflow-hidden shrink-0">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={country.image_url || 'https://images.unsplash.com/photo-1469854523086-cc02fe5d8800?q=80&w=2021&auto=format&fit=crop'}
                    alt={country.name}
                    className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700 ease-out"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-gray-900/90 via-gray-900/20 to-transparent" />
                  <div className="absolute bottom-6 left-6 right-6 flex justify-between items-end">
                    <h3 className="text-3xl font-extrabold text-white drop-shadow-md">{country.name}</h3>
                    <span className="text-4xl drop-shadow-xl group-hover:scale-125 group-hover:-rotate-6 transition-transform duration-300 origin-bottom-right">{country.flag}</span>
                  </div>
                </div>
                <div className="p-6 flex-grow flex flex-col">
                  <p className="text-gray-600 line-clamp-3 mb-6 flex-grow leading-relaxed">{country.description}</p>
                </div>
              </Link>
            ))}
          </div>
        ) : (
          <p className="text-center text-gray-400 italic py-12 bg-white rounded-3xl border border-gray-100 shadow-sm">Zatím tu nejsou žádné země.</p>
        )}
      </section>

    </main>
  );
}