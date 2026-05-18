'use client';

import { supabase } from '@/lib/supabaseBrowserClient';
import type { Provider } from '@supabase/supabase-js';
import Link from 'next/link';
import { useLocale } from 'next-intl';
import { useRouter } from 'next/navigation';
import { useEffect, useMemo, useState } from 'react';

function getAuthErrorMessage(error: unknown): string {
  if (!(error instanceof Error)) {
    return 'Nastala neznámá chyba.';
  }

  if (error.message === 'Invalid login credentials') {
    return 'Špatný e-mail nebo heslo.';
  }

  if (error.message === 'User already registered') {
    return 'Tento e-mail už je zaregistrovaný.';
  }

  if (error.message.includes('Password should be at least 6 characters')) {
    return 'Heslo musí mít alespoň 6 znaků.';
  }

  return `Něco se pokazilo: ${error.message}`;
}

const oauthProviderLabels: Record<'google' | 'facebook', string> = {
  google: 'Google',
  facebook: 'Facebook',
};

const oauthProviderEnabled: Record<'google' | 'facebook', boolean> = {
  google: process.env.NEXT_PUBLIC_SUPABASE_AUTH_GOOGLE_ENABLED === 'true',
  facebook: process.env.NEXT_PUBLIC_SUPABASE_AUTH_FACEBOOK_ENABLED === 'true',
};

export default function LoginPage() {
  const locale = useLocale();
  const router = useRouter();
  const [isSignUp, setIsSignUp] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [loading, setLoading] = useState(false);
  const [oauthProvider, setOauthProvider] = useState<Provider | null>(null);

  const profileUrl = useMemo(() => `/${locale}/profile`, [locale]);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      if (data.session?.user) {
        router.replace(profileUrl);
      }
    });
  }, [profileUrl, router]);

  const getRedirectUrl = () => `${window.location.origin}${profileUrl}`;

  const handleAuth = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setLoading(true);
    setError('');
    setNotice('');

    try {
      if (isSignUp) {
        const { data, error: signUpError } = await supabase.auth.signUp({
          email,
          password,
          options: {
            emailRedirectTo: getRedirectUrl(),
          },
        });

        if (signUpError) {
          throw signUpError;
        }

        if (data.session?.user) {
          router.push(profileUrl);
          router.refresh();
        } else {
          setNotice('Účet je založený. Pokud je zapnuté potvrzení e-mailu, najdeš potvrzovací odkaz ve schránce.');
        }
      } else {
        const { error: signInError } = await supabase.auth.signInWithPassword({ email, password });

        if (signInError) {
          throw signInError;
        }

        router.push(profileUrl);
        router.refresh();
      }
    } catch (err) {
      setError(getAuthErrorMessage(err));
    } finally {
      setLoading(false);
    }
  };

  const handleOAuth = async (provider: Provider) => {
    if ((provider === 'google' || provider === 'facebook') && !oauthProviderEnabled[provider]) {
      setError(
        `Přihlášení přes ${oauthProviderLabels[provider]} je připravené ve frontendu, ale provider ještě není zapnutý v Supabase. Zapni ho v Supabase Auth > Providers a nastav NEXT_PUBLIC_SUPABASE_AUTH_${provider.toUpperCase()}_ENABLED=true.`
      );
      setNotice('');
      return;
    }

    setOauthProvider(provider);
    setError('');
    setNotice('');

    const { error: oauthError } = await supabase.auth.signInWithOAuth({
      provider,
      options: {
        redirectTo: getRedirectUrl(),
      },
    });

    if (oauthError) {
      setError(getAuthErrorMessage(oauthError));
      setOauthProvider(null);
    }
  };

  return (
    <main className="flex min-h-screen flex-col items-center justify-center bg-gray-50 p-4">
      <div className="absolute left-6 top-6">
        <Link href={`/${locale}`} className="font-bold text-blue-900 hover:underline">
          &larr; Zpět na web
        </Link>
      </div>

      <div className="w-full max-w-md rounded-3xl border border-gray-100 bg-white p-8 shadow-xl">
        <div className="mb-8 text-center">
          <h1 className="mb-2 text-3xl font-extrabold text-blue-900">
            {isSignUp ? 'Vytvořit účet' : 'Vítejte zpět'}
          </h1>
          <p className="text-gray-500">
            {isSignUp
              ? 'Zaregistruj se, komentuj články a spravuj si svůj profil.'
              : 'Přihlas se a pokračuj v objevování Evropy.'}
          </p>
        </div>

        <div className="mb-6 grid gap-3 sm:grid-cols-2">
          <button
            type="button"
            onClick={() => handleOAuth('google')}
            disabled={Boolean(oauthProvider)}
            className={`rounded-xl border px-4 py-3 text-sm font-extrabold transition disabled:cursor-not-allowed disabled:opacity-60 ${
              oauthProviderEnabled.google
                ? 'border-gray-200 text-gray-700 hover:bg-gray-50'
                : 'border-amber-200 bg-amber-50 text-amber-800 hover:bg-amber-100'
            }`}
          >
            {oauthProvider === 'google' ? 'Přesměrovávám...' : 'Google'}
          </button>
          <button
            type="button"
            onClick={() => handleOAuth('facebook')}
            disabled={Boolean(oauthProvider)}
            className={`rounded-xl border px-4 py-3 text-sm font-extrabold transition disabled:cursor-not-allowed disabled:opacity-60 ${
              oauthProviderEnabled.facebook
                ? 'border-gray-200 text-gray-700 hover:bg-gray-50'
                : 'border-amber-200 bg-amber-50 text-amber-800 hover:bg-amber-100'
            }`}
          >
            {oauthProvider === 'facebook' ? 'Přesměrovávám...' : 'Facebook'}
          </button>
        </div>

        {(!oauthProviderEnabled.google || !oauthProviderEnabled.facebook) && (
          <p className="-mt-3 mb-6 rounded-xl bg-amber-50 p-3 text-center text-xs font-semibold leading-relaxed text-amber-800">
            Sociální přihlášení se zobrazí jako aktivní po zapnutí providerů v Supabase.
          </p>
        )}

        <div className="mb-6 flex items-center gap-3 text-xs font-bold uppercase tracking-wide text-gray-400">
          <span className="h-px flex-1 bg-gray-100" />
          nebo e-mailem
          <span className="h-px flex-1 bg-gray-100" />
        </div>

        <form onSubmit={handleAuth} className="space-y-5">
          <label className="block text-sm font-bold text-gray-700">
            <span className="mb-1 block">E-mail</span>
            <input
              type="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              required
              className="w-full rounded-xl border-2 border-gray-100 p-3 transition-colors focus:border-blue-500 focus:ring-0"
              placeholder="tvuj@email.cz"
            />
          </label>

          <label className="block text-sm font-bold text-gray-700">
            <span className="mb-1 block">Heslo</span>
            <input
              type="password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              required
              minLength={6}
              className="w-full rounded-xl border-2 border-gray-100 p-3 transition-colors focus:border-blue-500 focus:ring-0"
              placeholder="••••••••"
            />
          </label>

          {notice && (
            <div className="rounded-xl border border-green-200 bg-green-50 p-3 text-center text-sm font-bold text-green-700">
              {notice}
            </div>
          )}

          {error && (
            <div className="rounded-xl border border-red-200 bg-red-50 p-3 text-center text-sm font-bold text-red-600">
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-xl bg-blue-900 py-4 font-bold text-white transition-colors hover:bg-blue-800 disabled:opacity-70"
          >
            {loading ? 'Zpracovávám...' : isSignUp ? 'Zaregistrovat se' : 'Přihlásit se'}
          </button>
        </form>

        <div className="mt-8 border-t pt-6 text-center">
          <p className="text-sm text-gray-600">
            {isSignUp ? 'Už máš účet?' : 'Ještě nemáš účet?'}
          </p>
          <button
            type="button"
            onClick={() => {
              setIsSignUp(!isSignUp);
              setError('');
              setNotice('');
            }}
            className="mt-1 font-bold text-blue-600 hover:underline"
          >
            {isSignUp ? 'Přihlas se zde' : 'Vytvoř si ho zdarma'}
          </button>
        </div>
      </div>
    </main>
  );
}
