'use client';

import { supabase } from '@/lib/supabaseBrowserClient';
import type { Session, User } from '@supabase/supabase-js';
import Link from 'next/link';
import { useLocale } from 'next-intl';
import { useRouter } from 'next/navigation';
import { useEffect, useMemo, useState } from 'react';

function metadataValue(user: User | null, key: string): string {
  const value = user?.user_metadata?.[key];
  return typeof value === 'string' ? value : '';
}

export default function ProfilePage() {
  const locale = useLocale();
  const router = useRouter();
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [status, setStatus] = useState('');
  const [error, setError] = useState('');
  const [email, setEmail] = useState('');
  const [fullName, setFullName] = useState('');
  const [username, setUsername] = useState('');
  const [website, setWebsite] = useState('');
  const [bio, setBio] = useState('');
  const [newPassword, setNewPassword] = useState('');

  const user = session?.user ?? null;
  const loginUrl = useMemo(() => `/${locale}/login`, [locale]);
  const providerLabel = useMemo(() => {
    const identities = user?.identities ?? [];
    const providers = identities
      .map((identity) => identity.provider)
      .filter(Boolean);

    return providers.length > 0 ? providers.join(', ') : 'email';
  }, [user]);

  useEffect(() => {
    let active = true;

    supabase.auth.getSession().then(({ data }) => {
      if (!active) {
        return;
      }

      if (!data.session?.user) {
        setLoading(false);
        router.replace(loginUrl);
        return;
      }

      const nextUser = data.session.user;
      setSession(data.session);
      setEmail(nextUser.email ?? '');
      setFullName(metadataValue(nextUser, 'full_name') || metadataValue(nextUser, 'name'));
      setUsername(metadataValue(nextUser, 'username') || metadataValue(nextUser, 'user_name'));
      setWebsite(metadataValue(nextUser, 'website'));
      setBio(metadataValue(nextUser, 'bio'));
      setLoading(false);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      setSession(nextSession);
      if (!nextSession?.user) {
        setLoading(false);
        router.replace(loginUrl);
      }
    });

    return () => {
      active = false;
      subscription.unsubscribe();
    };
  }, [loginUrl, router]);

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!user) {
      return;
    }

    setSaving(true);
    setStatus('');
    setError('');

    const updates = {
      data: {
        full_name: fullName.trim(),
        name: fullName.trim(),
        username: username.trim(),
        website: website.trim(),
        bio: bio.trim(),
      },
      ...(email.trim() && email.trim() !== user.email ? { email: email.trim() } : {}),
      ...(newPassword.trim() ? { password: newPassword.trim() } : {}),
    };

    const { data, error: updateError } = await supabase.auth.updateUser(updates);

    if (updateError) {
      setError(updateError.message);
    } else {
      setSession((current) => current ? { ...current, user: data.user } : current);
      setNewPassword('');
      setStatus(email.trim() !== user.email
        ? 'Profil uložen. Změnu e-mailu může být potřeba potvrdit v e-mailové schránce.'
        : 'Profil uložen.'
      );
    }

    setSaving(false);
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.push(`/${locale}`);
  };

  if (loading) {
    return (
      <main className="min-h-screen bg-slate-50 px-4 py-12">
        <div className="mx-auto max-w-3xl rounded-2xl border border-slate-200 bg-white p-8 shadow-sm">
          <div className="h-8 w-40 animate-pulse rounded bg-slate-100" />
          <div className="mt-6 h-56 animate-pulse rounded-xl bg-slate-100" />
        </div>
      </main>
    );
  }

  if (!user) {
    return (
      <main className="min-h-screen bg-slate-50 px-4 py-12 text-slate-950">
        <section className="mx-auto max-w-xl rounded-2xl border border-slate-200 bg-white p-8 text-center shadow-sm">
          <p className="text-sm font-bold uppercase tracking-wide text-blue-700">Euvida účet</p>
          <h1 className="mt-2 text-3xl font-black tracking-tight text-slate-950">
            Přihlášení je potřeba
          </h1>
          <p className="mt-3 text-sm leading-relaxed text-slate-600">
            Profil a komentáře můžeš spravovat po přihlášení.
          </p>
          <Link
            href={loginUrl}
            className="mt-6 inline-flex rounded-xl bg-blue-900 px-5 py-3 text-sm font-extrabold text-white transition hover:bg-blue-800"
          >
            Přihlásit se
          </Link>
        </section>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-slate-50 px-4 py-12 text-slate-950">
      <div className="mx-auto max-w-3xl">
        <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-sm font-bold uppercase tracking-wide text-blue-700">Euvida účet</p>
            <h1 className="mt-1 text-3xl font-black tracking-tight text-slate-950">
              Můj profil
            </h1>
          </div>
          <Link
            href={`/${locale}`}
            className="w-fit rounded-xl bg-white px-4 py-2 text-sm font-extrabold text-blue-900 shadow-sm ring-1 ring-slate-200 transition hover:bg-blue-50"
          >
            Zpět na web
          </Link>
        </div>

        <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="mb-6 rounded-xl bg-blue-50 p-4">
            <p className="text-sm font-bold text-blue-950">Přihlášení</p>
            <p className="mt-1 break-words text-sm text-blue-900">
              {user?.email} · {providerLabel}
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-5">
            <div className="grid gap-4 md:grid-cols-2">
              <label className="grid gap-1 text-sm font-bold text-slate-700">
                <span>Jméno</span>
                <input
                  value={fullName}
                  onChange={(event) => setFullName(event.target.value)}
                  className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-3 text-slate-900 outline-none transition focus:border-blue-300 focus:bg-white focus:ring-2 focus:ring-blue-100"
                  placeholder="Jak se máš zobrazovat u komentářů"
                />
              </label>

              <label className="grid gap-1 text-sm font-bold text-slate-700">
                <span>Uživatelské jméno</span>
                <input
                  value={username}
                  onChange={(event) => setUsername(event.target.value)}
                  className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-3 text-slate-900 outline-none transition focus:border-blue-300 focus:bg-white focus:ring-2 focus:ring-blue-100"
                  placeholder="např. cestovatelka"
                />
              </label>
            </div>

            <label className="grid gap-1 text-sm font-bold text-slate-700">
              <span>E-mail</span>
              <input
                type="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-3 text-slate-900 outline-none transition focus:border-blue-300 focus:bg-white focus:ring-2 focus:ring-blue-100"
              />
            </label>

            <label className="grid gap-1 text-sm font-bold text-slate-700">
              <span>Web nebo sociální profil</span>
              <input
                value={website}
                onChange={(event) => setWebsite(event.target.value)}
                className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-3 text-slate-900 outline-none transition focus:border-blue-300 focus:bg-white focus:ring-2 focus:ring-blue-100"
                placeholder="https://..."
              />
            </label>

            <label className="grid gap-1 text-sm font-bold text-slate-700">
              <span>Krátké bio</span>
              <textarea
                value={bio}
                onChange={(event) => setBio(event.target.value)}
                rows={4}
                maxLength={500}
                className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-3 text-slate-900 outline-none transition focus:border-blue-300 focus:bg-white focus:ring-2 focus:ring-blue-100"
                placeholder="Napiš pár slov o sobě."
              />
            </label>

            <label className="grid gap-1 text-sm font-bold text-slate-700">
              <span>Nové heslo</span>
              <input
                type="password"
                value={newPassword}
                onChange={(event) => setNewPassword(event.target.value)}
                className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-3 text-slate-900 outline-none transition focus:border-blue-300 focus:bg-white focus:ring-2 focus:ring-blue-100"
                placeholder="Vyplň jen pokud ho chceš změnit"
              />
            </label>

            {status && (
              <p className="rounded-xl border border-green-200 bg-green-50 p-3 text-sm font-semibold text-green-800">
                {status}
              </p>
            )}

            {error && (
              <p className="rounded-xl border border-red-200 bg-red-50 p-3 text-sm font-semibold text-red-700">
                {error}
              </p>
            )}

            <div className="flex flex-col gap-3 border-t border-slate-100 pt-5 sm:flex-row sm:items-center sm:justify-between">
              <button
                type="submit"
                disabled={saving}
                className="rounded-xl bg-blue-900 px-5 py-3 text-sm font-extrabold text-white transition hover:bg-blue-800 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {saving ? 'Ukládám...' : 'Uložit profil'}
              </button>
              <button
                type="button"
                onClick={handleLogout}
                className="rounded-xl bg-slate-100 px-5 py-3 text-sm font-extrabold text-slate-700 transition hover:bg-slate-200"
              >
                Odhlásit se
              </button>
            </div>
          </form>
        </section>
      </div>
    </main>
  );
}
