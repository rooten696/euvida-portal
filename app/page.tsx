import Link from 'next/link';

// Dočasná data, než napojíme databázi
const featuredCountries = [
  { id: 'ESP', name: 'Španělsko', description: 'Země slunce, vášně a nekonečné rozmanitosti.', flag: '🇪🇸' },
  { id: 'CZE', name: 'Česko', description: 'Srdce Evropy s bohatou historií a kulturou.', flag: '🇨🇿' },
  { id: 'UKR', name: 'Ukrajina', description: 'Hrdá země s pulzujícími městy a tradicemi.', flag: '🇺🇦' },
];

export default function HomePage() {
  return (
    <main className="min-h-screen bg-gray-50 text-gray-900 font-sans">
      
      {/* --- HERO SEKCE (Úvodní banner) --- */}
      <section className="bg-blue-900 text-white py-20 px-4 text-center">
        <h1 className="text-5xl font-bold mb-4">
          Objevte Evropu bez hranic.
        </h1>
        <p className="text-xl text-yellow-400 mb-8 max-w-2xl mx-auto">
          Váš průvodce životem, prací a cestováním. Od polární záře po pláže Středozemního moře.
        </p>
        
        {/* Vyhledávací pole */}
        <div className="max-w-md mx-auto bg-white rounded-full flex overflow-hidden p-1 shadow-lg">
          <input 
            type="text" 
            placeholder="Kam to bude? Např. Španělsko..." 
            className="w-full px-4 py-2 text-gray-800 outline-none"
          />
          <button className="bg-yellow-400 text-blue-900 font-bold px-6 py-2 rounded-full hover:bg-yellow-300 transition-colors">
            Hledat
          </button>
        </div>
      </section>

      {/* --- VÝPIS ZEMÍ (Karty) --- */}
      <section className="max-w-5xl mx-auto py-16 px-4">
        <h2 className="text-3xl font-bold mb-8 text-center">Oblíbené destinace</h2>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {featuredCountries.map((country) => (
            <Link href={`/cs/${country.id}`} key={country.id}>
              <div className="bg-white p-6 rounded-2xl shadow-sm hover:shadow-md transition-shadow cursor-pointer border border-gray-100">
                <div className="text-4xl mb-4">{country.flag}</div>
                <h3 className="text-2xl font-bold mb-2">{country.name}</h3>
                <p className="text-gray-600">{country.description}</p>
              </div>
            </Link>
          ))}
        </div>
      </section>

    </main>
  );
}