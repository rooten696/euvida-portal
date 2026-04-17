'use client';

import { useState, useEffect, useCallback } from 'react';
import { createClient, Session } from '@supabase/supabase-js';
import Link from 'next/link';

type CountryData = {
  id: string;
  name: string;
  flag: string;
  description: string;
  general_info: string;
  travel_tourism: string;
  life_work: string;
  culture_food: string;
  image_url: string;
};

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

export default function AdminPage() {
  const [session, setSession] = useState<Session | null>(null);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [authError, setAuthError] = useState('');
  
  const [countries, setCountries] = useState<CountryData[]>([]);
  const [formData, setFormData] = useState<CountryData>({
    id: '', name: '', flag: '', description: '', general_info: '', travel_tourism: '', life_work: '', culture_food: '', image_url: ''
  });
  const [status, setStatus] = useState('');
  const [isEditing, setIsEditing] = useState(false);

  const fetchCountries = useCallback(async () => {
    const { data } = await supabase.from('countries').select('*').order('name');
    if (data) setCountries(data as CountryData[]);
  }, []);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => setSession(session));
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => setSession(session));
    
    // Tímto speciálním komentářem hlídači řekneme, ať u tohoto řádku zavře oči,
    // protože víme, že stahování dat při načtení stránky je v naprostém pořádku.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    fetchCountries(); 
    
    return () => subscription.unsubscribe();
  }, [fetchCountries]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthError('');
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) setAuthError('❌ Špatný e-mail nebo heslo.');
  };

  const handleLogout = async () => { await supabase.auth.signOut(); };

  const selectCountry = (country: CountryData) => {
    setFormData(country);
    setIsEditing(true);
    setStatus('');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const resetForm = () => {
    setFormData({ id: '', name: '', flag: '', description: '', general_info: '', travel_tourism: '', life_work: '', culture_food: '', image_url: '' });
    setIsEditing(false);
    setStatus('');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setStatus('Ukládám...');
    
    const { error } = await supabase.from('countries').upsert([formData]);

    if (error) {
      setStatus('❌ Chyba: ' + error.message);
    } else {
      setStatus(isEditing ? '✅ Změny uloženy!' : '✅ Země přidána!');
      fetchCountries();
      if (!isEditing) resetForm();
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Opravdu chcete tuto zemi smazat?')) return;
    const { error } = await supabase.from('countries').delete().eq('id', id);
    if (!error) {
      fetchCountries();
      resetForm();
      setStatus('🗑️ Země smazána.');
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  if (!session) {
    return (
      <main className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <form onSubmit={handleLogin} className="bg-white p-8 rounded-2xl shadow-lg max-w-sm w-full">
          <h1 className="text-2xl font-bold text-blue-900 mb-6 text-center">Přihlášení do CMS</h1>
          <div className="space-y-4">
            <input type="email" placeholder="E-mail" value={email} onChange={(e) => setEmail(e.target.value)} required className="w-full border rounded-lg p-3" />
            <input type="password" placeholder="Heslo" value={password} onChange={(e) => setPassword(e.target.value)} required className="w-full border rounded-lg p-3" />
            {authError && <p className="text-red-600 text-sm text-center">{authError}</p>}
            <button type="submit" className="w-full bg-blue-900 text-white font-bold py-3 rounded-xl">Vstoupit</button>
            <div className="text-center pt-2">
              <Link href="/" className="text-sm text-blue-600 hover:underline">Zpět na web</Link>
            </div>
          </div>
        </form>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-gray-50 text-gray-900 py-12 px-4">
      <div className="max-w-6xl mx-auto grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        <div className="lg:col-span-1 space-y-4">
          <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
            <div className="flex justify-between items-center mb-4">
              <h2 className="font-bold text-xl text-blue-900">Země v DB</h2>
              <button onClick={resetForm} className="text-xs bg-blue-100 text-blue-700 px-3 py-1 rounded-full font-bold hover:bg-blue-200">
                + Přidat
              </button>
            </div>
            <div className="space-y-2 max-h-[600px] overflow-y-auto pr-2">
              {countries.map(c => (
                <div 
                  key={c.id} 
                  onClick={() => selectCountry(c)}
                  className={`p-3 rounded-xl border cursor-pointer transition-all flex items-center gap-3 ${formData.id === c.id ? 'border-blue-500 bg-blue-50' : 'border-gray-100 hover:bg-gray-50'}`}
                >
                  <span className="text-2xl">{c.flag}</span>
                  <span className="font-medium flex-grow">{c.name}</span>
                  <span className="text-xs text-gray-400">{c.id}</span>
                </div>
              ))}
            </div>
          </div>
          <div className="flex justify-between items-center px-2">
            <Link href="/" className="text-blue-600 text-sm font-medium hover:underline">← Na web</Link>
            <button onClick={handleLogout} className="text-gray-500 text-sm hover:underline">Odhlásit se</button>
          </div>
        </div>

        <div className="lg:col-span-2">
          <form onSubmit={handleSubmit} className="bg-white p-8 rounded-2xl shadow-sm border border-gray-100 space-y-6">
            <h2 className="text-2xl font-bold text-blue-900">{isEditing ? `Upravit: ${formData.name}` : 'Přidat novou zemi'}</h2>
            
            <div className="grid grid-cols-2 gap-4">
              <div className="col-span-2 md:col-span-1">
                <label className="block text-xs font-bold mb-1">ID (např. ITA) {isEditing && '(Nelze měnit)'}</label>
                <input required disabled={isEditing} type="text" name="id" value={formData.id} onChange={handleChange} className="w-full border rounded-lg p-3 bg-gray-50 disabled:opacity-50" />
              </div>
              <div className="col-span-2 md:col-span-1">
                <label className="block text-xs font-bold mb-1">Název</label>
                <input required type="text" name="name" value={formData.name} onChange={handleChange} className="w-full border rounded-lg p-3 bg-gray-50" />
              </div>
              <div className="col-span-2 md:col-span-1">
                <label className="block text-xs font-bold mb-1">Vlajka (Emoji)</label>
                <input required type="text" name="flag" value={formData.flag} onChange={handleChange} className="w-full border rounded-lg p-3 bg-gray-50" />
              </div>
              <div className="col-span-2 md:col-span-1">
                <label className="block text-xs font-bold mb-1">Krátký popisek</label>
                <input required type="text" name="description" value={formData.description} onChange={handleChange} className="w-full border rounded-lg p-3 bg-gray-50" />
              </div>
              <div className="col-span-2">
                <label className="block text-xs font-bold mb-1">Odkaz na fotku (Unsplash)</label>
                <input type="text" name="image_url" value={formData.image_url} onChange={handleChange} className="w-full border rounded-lg p-3 bg-gray-50" />
              </div>
            </div>

            <div className="space-y-4">
              {['general_info', 'travel_tourism', 'life_work', 'culture_food'].map(field => (
                <div key={field}>
                  <label className="block text-xs font-bold mb-1 capitalize">{field.replace('_', ' ')}</label>
                  <textarea name={field} value={formData[field as keyof CountryData]} onChange={handleChange} rows={3} className="w-full border rounded-lg p-3 bg-gray-50" />
                </div>
              ))}
            </div>

            {status && <div className={`p-4 rounded-lg font-bold ${status.includes('❌') ? 'bg-red-100 text-red-800' : 'bg-green-100 text-green-800'}`}>{status}</div>}

            <div className="flex gap-4">
              <button type="submit" className="flex-grow bg-blue-900 text-white font-bold py-4 rounded-xl hover:bg-blue-800 transition-colors">
                {isEditing ? 'Uložit změny' : 'Přidat zemi'}
              </button>
              {isEditing && (
                <button type="button" onClick={() => handleDelete(formData.id)} className="bg-red-100 text-red-700 px-6 rounded-xl font-bold hover:bg-red-200 transition-colors">
                  Smazat
                </button>
              )}
            </div>
          </form>
        </div>

      </div>
    </main>
  );
}