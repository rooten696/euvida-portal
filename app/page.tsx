import { createClient } from '@supabase/supabase-js';
import CountrySearch from './components/CountrySearch'; // Import naší nové komponenty

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

export default async function HomePage() {
  // Server stáhne data z databáze jako vždycky
  const { data: countries, error } = await supabase
    .from('countries')
    .select('*');

  if (error) console.error('Chyba při načítání:', error);

  return (
    <main className="min-h-screen bg-gray-50 text-gray-900 font-sans">
      
      {/* Hero sekce (Všimni si pb-32 na konci, děláme místo pro posunuté vyhledávání) */}
      <section className="bg-blue-900 text-white py-20 px-4 text-center pb-32">
        <h1 className="text-5xl font-bold mb-4">Objevte Evropu bez hranic.</h1>
        <p className="text-xl text-yellow-400 mb-8 max-w-2xl mx-auto">
          Váš průvodce životem, prací a cestováním. Od polární záře po pláže Středozemního moře.
        </p>
      </section>

      {/* Předáváme stažená data naší klientské komponentě */}
      <section className="max-w-5xl mx-auto px-4 pb-16">
        <CountrySearch initialCountries={countries || []} />
      </section>

    </main>
  );
}