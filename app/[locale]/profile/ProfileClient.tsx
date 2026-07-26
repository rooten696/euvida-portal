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

export default function ProfileClient() {
  const locale = useLocale();
  const router = useRouter();
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [savingProfile, setSavingProfile] = useState(false);
  const [savingPassword, setSavingPassword] = useState(false);
  const [profileStatus, setProfileStatus] = useState('');
  const [profileError, setProfileError] = useState('');
  const [passwordStatus, setPasswordStatus] = useState('');
  const [passwordError, setPasswordError] = useState('');

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
      if (!active) return;

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

  const handleProfileSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!user) return;

    setSavingProfile(true);
    setProfileStatus('');
    setProfileError('');

    const updates = {
      data: {
        full_name: fullName.trim(),
        name: fullName.trim(),
        username: username.trim(),
        website: website.trim(),
        bio: bio.trim(),
      },
      ...(email.trim() && email.trim() !== user.email ? { email: email.trim() } : {}),
    };

    const { data, error: updateError } = await supabase.auth.updateUser(updates);

    if (updateError) {
      setProfileError(updateError.message);
    } else {
      setSession((current) => current ? { ...current, user: data.user } : current);
      setProfileStatus(email.trim() !== user.email
        ? 'Profil uložen. Změnu e-mailu může být potřeba potvrdit v e-mailové schránce.'
        : 'Profil uložen.'
      );
    }

    setSavingProfile(false);
  };

  const handlePasswordSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!user) return;

    if (!newPassword.trim()) {
      setPasswordError('Zadejte prosím nové heslo.');
      return;
    }

    setSavingPassword(true);
    setPasswordStatus('');
    setPasswordError('');

    const { error: updateError } = await supabase.auth.updateUser({
      password: newPassword.trim(),
    });

    if (updateError) {
      setPasswordError(updateError.message);
    } else {
      setNewPassword('');
      setPasswordStatus('Heslo bylo úspěšně změněno.');
    }

    setSavingPassword(false);
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.push(`/${locale}`);
  };

  if (loading) {
    return (
      <main className="min-h-screen bg-slate-950 px-4 py-12 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-emerald-500"></div>
      </main>
    );
  }

  if (!user) return null;

  return (
    <main className="min-h-screen bg-slate-950 px-4 py-12 font-sans text-slate-100">
      <div className="mx-auto max-w-3xl">
        <div className="mb-8 flex items-center justify-between">
          <div>
            <p className="text-sm font-extrabold uppercase tracking-wide text-emerald-400">Euvida účet</p>
            <h1 className="mt-1 text-3xl font-black tracking-tight text-white">
              Můj profil
            </h1>
          </div>
          <Link
            href={`/${locale}`}
            className="rounded-xl bg-slate-900 border border-white/10 px-5 py-2.5 text-sm font-extrabold text-white transition hover:bg-slate-800 shadow-sm"
          >
            Zpět na web
          </Link>
        </div>

        {/* 1. Profile Info Card */}
        <section className="rounded-3xl border border-white/10 bg-slate-900 p-6 md:p-8 shadow-xl space-y-6">
          <div className="rounded-2xl bg-slate-950 border border-white/5 p-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
            <div>
              <p className="text-xs font-extrabold uppercase tracking-wide text-slate-400">Přihlášený e-mail</p>
              <p className="mt-0.5 break-all text-sm font-bold text-emerald-400">{user?.email}</p>
            </div>
            <div className="sm:text-right">
              <p className="text-xs font-extrabold uppercase tracking-wide text-slate-400">Metoda přihlášení</p>
              <span className="inline-block mt-0.5 rounded-full bg-slate-900 border border-white/10 px-3 py-1 text-xs font-bold text-slate-300">
                {providerLabel}
              </span>
            </div>
          </div>

          <form onSubmit={handleProfileSubmit} className="space-y-6">
            <div className="grid gap-4 md:grid-cols-2">
              <label className="grid gap-1.5 text-sm font-extrabold text-slate-300">
                <span>Jméno</span>
                <input
                  value={fullName}
                  onChange={(event) => setFullName(event.target.value)}
                  className="rounded-xl border border-white/10 bg-slate-950 px-4 py-3 text-slate-100 outline-none transition focus:border-emerald-500 focus:bg-slate-950 focus:ring-2 focus:ring-emerald-500/10 placeholder-slate-600"
                  placeholder="Jak se máš zobrazovat u komentářů"
                />
              </label>

              <label className="grid gap-1.5 text-sm font-extrabold text-slate-300">
                <span>Uživatelské jméno</span>
                <input
                  value={username}
                  onChange={(event) => setUsername(event.target.value)}
                  className="rounded-xl border border-white/10 bg-slate-950 px-4 py-3 text-slate-100 outline-none transition focus:border-emerald-500 focus:bg-slate-950 focus:ring-2 focus:ring-emerald-500/10 placeholder-slate-600"
                  placeholder="např. cestovatelka"
                />
              </label>
            </div>

            <label className="grid gap-1.5 text-sm font-extrabold text-slate-300">
              <span>E-mail</span>
              <input
                type="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                className="rounded-xl border border-white/10 bg-slate-950 px-4 py-3 text-slate-100 outline-none transition focus:border-emerald-500 focus:bg-slate-950 focus:ring-2 focus:ring-emerald-500/10"
              />
            </label>

            <label className="grid gap-1.5 text-sm font-extrabold text-slate-300">
              <span>Web nebo sociální profil</span>
              <input
                value={website}
                onChange={(event) => setWebsite(event.target.value)}
                className="rounded-xl border border-white/10 bg-slate-950 px-4 py-3 text-slate-100 outline-none transition focus:border-emerald-500 focus:bg-slate-950 focus:ring-2 focus:ring-emerald-500/10 placeholder-slate-600"
                placeholder="https://..."
              />
            </label>

            <label className="grid gap-1.5 text-sm font-extrabold text-slate-300">
              <span>Krátké bio</span>
              <textarea
                value={bio}
                onChange={(event) => setBio(event.target.value)}
                rows={4}
                maxLength={500}
                className="rounded-xl border border-white/10 bg-slate-950 px-4 py-3 text-slate-100 outline-none transition focus:border-emerald-500 focus:bg-slate-950 focus:ring-2 focus:ring-emerald-500/10 placeholder-slate-600 resize-none"
                placeholder="Napiš pár slov o sobě."
              />
            </label>

            {profileStatus && (
              <p className="rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-4 text-sm font-bold text-emerald-400">
                {profileStatus}
              </p>
            )}

            {profileError && (
              <p className="rounded-xl border border-red-500/30 bg-red-500/10 p-4 text-sm font-bold text-red-400">
                {profileError}
              </p>
            )}

            <div className="flex flex-col gap-3 border-t border-white/5 pt-6 sm:flex-row sm:items-center sm:justify-between">
              <button
                type="submit"
                disabled={savingProfile}
                className="rounded-xl bg-emerald-500 px-6 py-3.5 text-sm font-extrabold text-slate-950 transition hover:bg-emerald-400 disabled:cursor-not-allowed disabled:opacity-60 shadow-lg shadow-emerald-500/10"
              >
                {savingProfile ? 'Ukládám...' : 'Uložit profil'}
              </button>
              <button
                type="button"
                onClick={handleLogout}
                className="rounded-xl bg-slate-800 border border-white/10 px-6 py-3.5 text-sm font-extrabold text-slate-300 transition hover:bg-slate-700 hover:text-white"
              >
                Odhlásit se
              </button>
            </div>
          </form>
        </section>

        {/* 2. Password Change Card */}
        <section className="mt-8 rounded-3xl border border-white/10 bg-slate-900 p-6 md:p-8 shadow-xl">
          <h2 className="text-xl font-black text-white mb-4">Změna hesla</h2>
          
          <form onSubmit={handlePasswordSubmit} className="space-y-6">
            <label className="grid gap-1.5 text-sm font-extrabold text-slate-300">
              <span>Nové heslo</span>
              <input
                type="password"
                value={newPassword}
                onChange={(event) => setNewPassword(event.target.value)}
                className="rounded-xl border border-white/10 bg-slate-950 px-4 py-3 text-slate-100 outline-none transition focus:border-emerald-500 focus:bg-slate-950 focus:ring-2 focus:ring-emerald-500/10 placeholder-slate-600"
                placeholder="Zadej nové heslo"
              />
            </label>

            {passwordStatus && (
              <p className="rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-4 text-sm font-bold text-emerald-400">
                {passwordStatus}
              </p>
            )}

            {passwordError && (
              <p className="rounded-xl border border-red-500/30 bg-red-500/10 p-4 text-sm font-bold text-red-400">
                {passwordError}
              </p>
            )}

            <button
              type="submit"
              disabled={savingPassword}
              className="rounded-xl bg-emerald-500 px-6 py-3.5 text-sm font-extrabold text-slate-950 transition hover:bg-emerald-400 disabled:cursor-not-allowed disabled:opacity-60 shadow-lg shadow-emerald-500/10"
            >
              {savingPassword ? 'Ukládám...' : 'Změnit heslo'}
            </button>
          </form>
        </section>
      </div>
    </main>
  );
}
