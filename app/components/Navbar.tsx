'use client';

import Link from 'next/link';
import { createClient } from '@supabase/supabase-js';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

export default function Navbar() {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [user, setUser] = useState<any>(null);
  const router = useRouter();

  useEffect(() => {
    // 1. Zjistíme, jestli je někdo přihlášený hned po načtení
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
    });

    // 2. Posloucháme, jestli se někdo právě nepřihlásil/neodhlásil
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
      router.refresh();
    });

    return () => subscription.unsubscribe();
  }, [router]);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.push('/');
  };

  return (
    <nav className="bg-white/80 backdrop-blur-md border-b border-gray-100 shadow-sm sticky top-0 z-50 transition-all">
      <div className="max-w-6xl mx-auto px-4 py-4 flex justify-between items-center">
        
        {/* Logo */}
        <Link href="/" className="text-2xl font-extrabold text-blue-900 tracking-tighter hover:opacity-80 transition-opacity">
          EUVIDA<span className="text-yellow-400">.</span>
        </Link>

        {/* Pravá část s tlačítky */}
        <div className="flex items-center gap-4 md:gap-6">
          {user ? (
            <>
              {/* Tlačítko pro oblíbené (stránku vytvoříme vzápětí) */}
              <Link href="/oblibene" className="text-gray-600 hover:text-red-500 font-bold flex items-center gap-1 transition-colors text-sm md:text-base">
                <span className="text-red-500">❤️</span> Oblíbené
              </Link>
              
              <div className="hidden md:block text-xs font-medium text-gray-400 bg-gray-50 px-3 py-1 rounded-full border border-gray-100">
                {user.email}
              </div>
              
              <button onClick={handleLogout} className="bg-gray-100 text-gray-700 px-4 py-2 rounded-xl text-sm font-bold hover:bg-gray-200 transition-colors">
                Odhlásit
              </button>
            </>
          ) : (
            <Link href="/login" className="bg-blue-900 text-white px-6 py-2 rounded-xl text-sm font-bold hover:bg-blue-800 transition-all shadow-md hover:shadow-lg">
              Přihlásit se
            </Link>
          )}
        </div>
        
      </div>
    </nav>
  );
}