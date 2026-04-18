'use client'; // Toto magické slůvko říká, že tato komponenta běží v prohlížeči uživatele

import { useState } from 'react';
import Link from 'next/link';
type Country = {
  id: string;
  name: string;
  flag: string;
  description: string;
  image_url: string;
};
// Komponenta přijme data ze serveru (initialCountries)
export default function CountrySearch({ initialCountries }: { initialCountries: Country[] }) {
  // Zde ukládáme to, co uživatel aktuálně píše
  const [searchTerm, setSearchTerm] = useState('');

  // Filtrace: projdeme všechny země a necháme jen ty, které obsahují hledané slovo
  const filteredCountries = initialCountries.filter((country) => {
    const term = searchTerm.toLowerCase();
    return (
      country.name.toLowerCase().includes(term) ||
      country.description?.toLowerCase().includes(term)
    );
  });

  return (
    <div className="relative w-full">
      
      {/* Vyhledávací pole (Vysunuté nahoru, aby elegantně překrývalo modrou sekci) */}
      <div className="absolute left-1/2 -translate-x-1/2 -top-24 w-full max-w-md bg-white rounded-full flex overflow-hidden p-1 shadow-xl z-10">
        <input
          type="text"
          placeholder="Kam to bude? Např. Španělsko..."
          className="w-full px-4 py-2 text-gray-800 outline-none"
          value={searchTerm} // Propojení hodnoty s naší pamětí
          onChange={(e) => setSearchTerm(e.target.value)} // Reakce na psaní
        />
        <button className="bg-yellow-400 text-blue-900 font-bold px-6 py-2 rounded-full hover:bg-yellow-300 transition-colors">
          Hledat
        </button>
      </div>

      <h2 className="text-3xl font-bold mb-8 text-center pt-8">Oblíbené destinace</h2>

      {/* Výpis vyfiltrovaných zemí */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
        {filteredCountries.length > 0 ? (
          filteredCountries.map((country) => (
            <Link href={`/cs/${country.id}`} key={country.id}>
              <div className="bg-white p-6 rounded-2xl shadow-sm hover:shadow-md transition-shadow cursor-pointer border border-gray-100 h-full flex flex-col">
                <div className="text-4xl mb-4">{country.flag}</div>
                <h3 className="text-2xl font-bold mb-2">{country.name}</h3>
                <p className="text-gray-600 flex-grow">{country.description}</p>
              </div>
            </Link>
          ))
        ) : (
          /* Hláška, když hledání nic nenajde */
          <div className="col-span-3 text-center py-12 text-gray-500 text-lg">
            Nenalezli jsme žádnou zemi odpovídající výrazu &quot;{searchTerm};.
          </div>
        )}
      </div>
      
    </div>
  );
}