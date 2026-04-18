'use client';

import { useState } from 'react';
import { createClient } from '@supabase/supabase-js';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

export default function LoginPage() {
  const [isSignUp, setIsSignUp] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      if (isSignUp) {
        const { error: signUpError } = await supabase.auth.signUp({ email, password });
        if (signUpError) throw signUpError;
        router.push('/');
        router.refresh();
      } else {
        const { error: signInError } = await supabase.auth.signInWithPassword({ email, password });
        if (signInError) throw signInError;
        router.push('/');
        router.refresh();
      }
    } catch (err) {
      // Čistý TypeScript způsob, jak pracovat s chybami bez použití "any"
      if (err instanceof Error) {
        if (err.message === 'Invalid login credentials') {
          setError('❌ Špatný e-mail nebo heslo.');
        } else if (err.message === 'User already registered') {
          setError('❌ Tento e-mail už je zaregistrovaný.');
        } else if (err.message.includes('Password should be at least 6 characters')) {
          setError('❌ Heslo musí mít alespoň 6 znaků.');
        } else {
          setError('❌ Něco se pokazilo: ' + err.message);
        }
      } else {
        setError('❌ Nastala neznámá chyba.');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="min-h-screen bg-gray-50 flex flex-col items-center justify-center p-4">
      
      <div className="absolute top-6 left-6">
        <Link href="/" className="text-blue-900 font-bold hover:underline">
          &larr; Zpět na web
        </Link>
      </div>

      <div className="bg-white p-8 rounded-3xl shadow-xl border border-gray-100 max-w-md w-full">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-extrabold text-blue-900 mb-2">
            {isSignUp ? 'Vytvořit účet' : 'Vítejte zpět'}
          </h1>
          <p className="text-gray-500">
            {isSignUp 
              ? 'Zaregistruj se a začni si ukládat oblíbené země.' 
              : 'Přihlas se a pokračuj v objevování Evropy.'}
          </p>
        </div>

        <form onSubmit={handleAuth} className="space-y-5">
          <div>
            <label className="block text-sm font-bold text-gray-700 mb-1">E-mail</label>
            <input 
              type="email" 
              value={email} 
              onChange={(e) => setEmail(e.target.value)} 
              required 
              className="w-full border-2 border-gray-100 rounded-xl p-3 focus:border-blue-500 focus:ring-0 transition-colors" 
              placeholder="tvuj@email.cz"
            />
          </div>
          
          <div>
            <label className="block text-sm font-bold text-gray-700 mb-1">Heslo</label>
            <input 
              type="password" 
              value={password} 
              onChange={(e) => setPassword(e.target.value)} 
              required 
              className="w-full border-2 border-gray-100 rounded-xl p-3 focus:border-blue-500 focus:ring-0 transition-colors" 
              placeholder="••••••••"
            />
          </div>

          {error && (
            <div className="p-3 bg-red-50 border border-red-200 text-red-600 rounded-xl text-sm font-bold text-center">
              {error}
            </div>
          )}

          <button 
            type="submit" 
            disabled={loading}
            className="w-full bg-blue-900 text-white font-bold py-4 rounded-xl hover:bg-blue-800 transition-colors disabled:opacity-70"
          >
            {loading ? 'Zpracovávám...' : (isSignUp ? 'Zaregistrovat se' : 'Přihlásit se')}
          </button>
        </form>

        <div className="mt-8 text-center border-t pt-6">
          <p className="text-gray-600 text-sm">
            {isSignUp ? 'Už máš účet?' : 'Ještě nemáš účet?'}
          </p>
          <button 
            onClick={() => {
              setIsSignUp(!isSignUp);
              setError('');
            }} 
            className="text-blue-600 font-bold hover:underline mt-1"
          >
            {isSignUp ? 'Přihlas se zde' : 'Vytvoř si ho zdarma'}
          </button>
        </div>

      </div>
    </main>
  );
}