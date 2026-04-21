import Link from 'next/link';

export default function Footer() {
  return (
    <footer className="bg-slate-900 text-slate-300 py-12 border-t border-slate-800 mt-auto">
      <div className="max-w-6xl mx-auto px-4 grid grid-cols-1 md:grid-cols-4 gap-8">
        
        {/* Levý sloupec - Značka a popisek */}
        <div className="col-span-1 md:col-span-2">
          <Link href="/" className="text-2xl font-extrabold text-white tracking-tighter inline-block mb-4 hover:opacity-80 transition-opacity">
            EUVIDA<span className="text-yellow-400">.</span>
          </Link>
          <p className="text-sm leading-relaxed max-w-sm text-slate-400">
            Váš ultimátní průvodce pro cestování, stěhování a plnohodnotný život v těch nejkrásnějších evropských destinacích. Objevujte svět bez hranic.
          </p>
        </div>

        {/* Prostřední sloupec - Navigace */}
        <div>
          <h4 className="text-white font-bold mb-4 uppercase text-xs tracking-wider">Rychlé odkazy</h4>
          <ul className="space-y-2 text-sm font-medium">
            <li><Link href="/" className="hover:text-yellow-400 transition-colors">Domů</Link></li>
            <li><Link href="/oblibene" className="hover:text-yellow-400 transition-colors">Oblíbené destinace</Link></li>
            <li><Link href="/login" className="hover:text-yellow-400 transition-colors">Přihlášení a profil</Link></li>
          </ul>
        </div>

        {/* Pravý sloupec - Info a Právo */}
        <div>
          <h4 className="text-white font-bold mb-4 uppercase text-xs tracking-wider">Informace</h4>
          <ul className="space-y-2 text-sm font-medium">
            <li><Link href="#" className="hover:text-yellow-400 transition-colors">O projektu Euvida</Link></li>
            <li><Link href="#" className="hover:text-yellow-400 transition-colors">Ochrana soukromí</Link></li>
            <li><Link href="#" className="hover:text-yellow-400 transition-colors">Obchodní podmínky</Link></li>
          </ul>
        </div>
      </div>

      {/* Spodní linka - Copyright a Sítě */}
      <div className="max-w-6xl mx-auto px-4 mt-12 pt-8 border-t border-slate-800 text-sm flex flex-col md:flex-row justify-between items-center text-slate-500">
        <p>&copy; {new Date().getFullYear()} Euvida. Všechna práva vyhrazena.</p>
        <div className="mt-4 md:mt-0 flex gap-6 font-bold">
          <span className="cursor-pointer hover:text-white transition-colors">Instagram</span>
          <span className="cursor-pointer hover:text-white transition-colors">Facebook</span>
          <span className="cursor-pointer hover:text-white transition-colors">X (Twitter)</span>
        </div>
      </div>
    </footer>
  );
}