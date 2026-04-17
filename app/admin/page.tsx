'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@supabase/supabase-js';
import Link from 'next/link';

// Připojení k databázi
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

export default function AdminPage() {
  // Paměť pro přihlášení
  const [session, setSession] = useState<any>(null);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [authError, setAuthError] = useState('');

  // Paměť pro náš formulář
  const [formData, setFormData] = useState({
    id: '', name: '', flag: '', description: '', general_info: '', travel_tourism: '', life_work: '', culture_food: ''
  });
  const [status, setStatus] = useState('');

  // Zjištění, zda jsi už přihlášený (když stránku obnovíš)
  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
    });
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
    });
    return () => subscription.unsubscribe();
  }, []);

  // --- FUNKCE PRO PŘIHLÁŠENÍ ---
  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthError('');
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) setAuthError('❌ Špatný e-mail nebo heslo.');
  };

  // --- FUNKCE PRO ODHLÁŠENÍ ---
  const handleLogout = async () => {
    await supabase.auth.signOut();
  };

  // --- FUNKCE PRO ULOŽENÍ ZEMĚ ---
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setStatus('Ukládám...');
    const { error } = await supabase.from('countries').insert([formData]);
    if (error) {
      setStatus('❌ Chyba při ukládání: ' + error.message);
    } else {
      setStatus('✅ Země úspěšně přidána!');
      setFormData({ id: '', name: '', flag: '', description: '', general_info: '', travel_tourism: '', life_work: '', culture_food: '' });
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  // ==========================================
  // VYKRESLENÍ: Pokud nejsi přihlášen
  // ==========================================
  if (!session) {
    return (
      <main className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <form onSubmit={handleLogin} className="bg-white p-8 rounded-2xl shadow-lg border border-gray-100 max-w-sm w-full">
          <h1 className="text-2xl font-bold text-blue-900 mb-6 text-center">Přihlášení do CMS</h1>
          
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-bold mb-1">E-mail</label>
              <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required className="w-full border rounded-lg p-3" />
            </div>
            <div>
              <label className="block text-sm font-bold mb-1">Heslo</label>
              <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} required className="w-full border rounded-lg p-3" />
            </div>
            
            {authError && <p className="text-red-600 font-bold text-sm text-center">{authError}</p>}
            
            <button type="submit" className="w-full bg-blue-900 text-white font-bold py-3 rounded-xl hover:bg-blue-800">
              Vstoupit
            </button>
            <div className="text-center mt-4">
              <Link href="/" className="text-sm text-gray-500 hover:underline">Zpět na hlavní web</Link>
            </div>
          </div>
        </form>
      </main>
    );
  }

  // ==========================================
  // VYKRESLENÍ: Pokud JSI přihlášen (tvůj starý dobrý formulář)
  // ==========================================
  return (
    <main className="min-h-screen bg-gray-50 text-gray-900 py-12 px-4 font-sans">
      <div className="max-w-3xl mx-auto">
        
        <div className="flex justify-between items-center mb-8 bg-white p-4 rounded-xl shadow-sm border border-gray-100">
          <div>
            <h1 className="text-2xl font-bold text-blue-900">Euvida CMS</h1>
            <p className="text-sm text-gray-500">Přihlášen jako: {session.user.email}</p>
          </div>
          <div className="flex gap-4 items-center">
            <Link href="/" className="text-blue-600 hover:underline font-medium">Na web</Link>
            <button onClick={handleLogout} className="bg-red-100 text-red-700 px-4 py-2 rounded-lg font-bold hover:bg-red-200">
              Odhlásit
            </button>
          </div>
        </div>

        {/* ... TADY ZAČÍNÁ FORMULÁŘ NA PŘIDÁNÍ ZEMĚ ... */}
        <form onSubmit={handleSubmit} className="bg-white p-8 rounded-2xl shadow-sm border border-gray-100 space-y-6">
          <div className="grid grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-bold mb-2">Zkratka (ID) *</label>
              <input required type="text" name="id" value={formData.id} onChange={handleChange} placeholder="Např. ITA" className="w-full border rounded-lg p-3 bg-gray-50" />
            </div>
            <div>
              <label className="block text-sm font-bold mb-2">Název země *</label>
              <input required type="text" name="name" value={formData.name} onChange={handleChange} placeholder="Např. Itálie" className="w-full border rounded-lg p-3 bg-gray-50" />
            </div>
            <div>
              <label className="block text-sm font-bold mb-2">Vlajka (Emoji) *</label>
              <input required type="text" name="flag" value={formData.flag} onChange={handleChange} placeholder="Např. 🇮🇹" className="w-full border rounded-lg p-3 bg-gray-50" />
            </div>
            <div>
              <label className="block text-sm font-bold mb-2">Krátký popisek *</label>
              <input required type="text" name="description" value={formData.description} onChange={handleChange} className="w-full border rounded-lg p-3 bg-gray-50" />
            </div>
          </div>

          <hr className="my-6" />
          <h2 className="text-xl font-bold text-blue-900">Detailní texty</h2>

          <div>
            <label className="block text-sm font-bold mb-2">Obecné informace</label>
            <textarea name="general_info" value={formData.general_info} onChange={handleChange} rows={3} className="w-full border rounded-lg p-3 bg-gray-50"></textarea>
          </div>
          <div>
            <label className="block text-sm font-bold mb-2">Cestování a turistika</label>
            <textarea name="travel_tourism" value={formData.travel_tourism} onChange={handleChange} rows={3} className="w-full border rounded-lg p-3 bg-gray-50"></textarea>
          </div>
          <div>
            <label className="block text-sm font-bold mb-2">Život a práce</label>
            <textarea name="life_work" value={formData.life_work} onChange={handleChange} rows={3} className="w-full border rounded-lg p-3 bg-gray-50"></textarea>
          </div>
          <div>
            <label className="block text-sm font-bold mb-2">Kultura a jídlo</label>
            <textarea name="culture_food" value={formData.culture_food} onChange={handleChange} rows={3} className="w-full border rounded-lg p-3 bg-gray-50"></textarea>
          </div>

          {status && (
            <div className={`p-4 rounded-lg font-bold ${status.includes('❌') ? 'bg-red-100 text-red-800' : 'bg-green-100 text-green-800'}`}>
              {status}
            </div>
          )}

          <button type="submit" className="w-full bg-blue-900 text-white font-bold py-4 rounded-xl hover:bg-blue-800 transition-colors text-lg">
            Přidat zemi
          </button>
        </form>

      </div>
    </main>
  );
}