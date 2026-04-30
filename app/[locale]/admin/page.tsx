'use client';

import { useState, useEffect, useCallback } from 'react';
import { createClient, Session } from '@supabase/supabase-js';
// ODEBRÁNO: translateCountryData (už ho nepoužíváme, jedeme po částech)
import { translateRegionData, translateSingleText } from '../../actions/translate';

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
  translations?: Record<string, Record<string, string>>;
};

type RegionData = {
  id?: string;
  country_id: string;
  name: string;
  language: string;
  description: string;
  image_url: string;
  general_info?: string;
  nature_and_landscapes?: string;
  history_and_culture?: string;
  transport_and_life?: string;
  temp_spring_air?: string;
  temp_summer_air?: string;
  temp_autumn_air?: string;
  temp_winter_air?: string;
  temp_spring_sea?: string;
  temp_summer_sea?: string;
  temp_autumn_sea?: string;
  temp_winter_sea?: string;
  translations?: Record<string, Record<string, string>>;
};

type PlaceData = {
  id?: string;
  region_id: string;
  name: string;
  description: string;
  image_url: string;
};

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

const emptyRegion: RegionData = {
  country_id: '', name: '', language: '', description: '', image_url: '',
  general_info: '', nature_and_landscapes: '', history_and_culture: '', transport_and_life: '',
  temp_spring_air: '', temp_summer_air: '', temp_autumn_air: '', temp_winter_air: '',
  temp_spring_sea: '', temp_summer_sea: '', temp_autumn_sea: '', temp_winter_sea: ''
};

export default function AdminPage() {
  const [session, setSession] = useState<Session | null>(null);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [authError, setAuthError] = useState('');
  
  // ZMĚNA: Výchozí jazyk je nyní angličtina
  const [sourceLang, setSourceLang] = useState<'cs' | 'en'>('en');
  
  const [countries, setCountries] = useState<CountryData[]>([]);
  const [formData, setFormData] = useState<CountryData>({
    id: '', name: '', flag: '', description: '', general_info: '', travel_tourism: '', life_work: '', culture_food: '', image_url: ''
  });
  const [isEditing, setIsEditing] = useState(false);
  const [isCountryActive, setIsCountryActive] = useState(true);
  const [countryToDelete, setCountryToDelete] = useState(false);

  // STAV PRO PŘEKLAD KONKRÉTNÍHO POLE
  const [translatingField, setTranslatingField] = useState<string | null>(null);

  const [regions, setRegions] = useState<RegionData[]>([]);
  const [regionFormData, setRegionFormData] = useState<RegionData>(emptyRegion);
  const [isEditingRegion, setIsEditingRegion] = useState(false);
  const [isRegionActive, setIsRegionActive] = useState(false);
  const [regionToDelete, setRegionToDelete] = useState<string | null>(null);

  const [places, setPlaces] = useState<PlaceData[]>([]);
  const [placeFormData, setPlaceFormData] = useState<PlaceData>({
    region_id: '', name: '', description: '', image_url: ''
  });
  const [isEditingPlace, setIsEditingPlace] = useState(false);
  const [isPlaceActive, setIsPlaceActive] = useState(false);
  const [placeToDelete, setPlaceToDelete] = useState<string | null>(null);

  const [status, setStatus] = useState('');

  const fetchCountries = useCallback(async () => {
    const { data } = await supabase.from('countries').select('*').order('name');
    if (data) setCountries(data as CountryData[]);
  }, []);

  const fetchRegions = useCallback(async (countryId: string) => {
    const { data } = await supabase.from('regions').select('*').eq('country_id', countryId).order('name');
    if (data) setRegions(data as RegionData[]);
  }, []);

  const fetchPlaces = useCallback(async (regionId: string) => {
    const { data } = await supabase.from('places').select('*').eq('region_id', regionId).order('name');
    if (data) setPlaces(data as PlaceData[]);
  }, []);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => setSession(session));
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => setSession(session));
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

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const selectCountry = (country: CountryData) => {
    setFormData(country);
    setIsEditing(true);
    setIsCountryActive(false);
    setCountryToDelete(false);
    
    setRegionFormData({ ...emptyRegion, country_id: country.id });
    setIsEditingRegion(false);
    setIsRegionActive(false);
    setRegionToDelete(null);

    setPlaces([]);
    setPlaceFormData({ region_id: '', name: '', description: '', image_url: '' });
    setIsEditingPlace(false);
    setIsPlaceActive(false);
    setPlaceToDelete(null);

    fetchRegions(country.id);
    setStatus('');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const resetForm = () => {
    setFormData({ id: '', name: '', flag: '', description: '', general_info: '', travel_tourism: '', life_work: '', culture_food: '', image_url: '' });
    setIsEditing(false);
    setIsCountryActive(true);
    setCountryToDelete(false);
    setRegions([]);
    setPlaces([]);
    setStatus('');
  };

  // ULOŽENÍ ZEMĚ (Bez masivního překladu, jen ukládáme base data)
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setStatus('Ukládám do databáze...');
    try {
      const { error } = await supabase.from('countries').upsert([formData]);
      if (error) throw error;
      
      setStatus('✅ Země uložena!');
      setIsCountryActive(false);
      fetchCountries();
    } catch (err: unknown) {
      if (err instanceof Error) setStatus('❌ Chyba: ' + err.message);
      else setStatus('❌ Neočekávaná chyba při ukládání.');
    }
  };

  // FUNKCE PRO PŘEKLAD KONKRÉTNÍHO POLE
  const handleTranslateSingle = async (field: keyof CountryData) => {
    if (!formData.id) {
      setStatus('❌ Nejdřív musíš zemi uložit do databáze!');
      return;
    }
    
    setTranslatingField(field);
    setStatus(`🤖 Překládám pole: ${field}...`);

    try {
      const textToTranslate = formData[field] as string;
      const newTranslations = await translateSingleText(textToTranslate, sourceLang);

      const updatedTranslations = { ...(formData.translations || {}) };
      
      // Sloučení nových překladů s těmi stávajícími v JSONu
      Object.entries(newTranslations).forEach(([lang, translatedText]) => {
        if (!updatedTranslations[lang]) updatedTranslations[lang] = {};
        updatedTranslations[lang][field] = translatedText;
      });

      // Uložení rovnou do databáze (updatujeme jen JSON)
      const { error } = await supabase
        .from('countries')
        .update({ translations: updatedTranslations })
        .eq('id', formData.id);

      if (error) throw error;

      // Aktualizace lokálního stavu (aby se hned vybarvily vlaječky)
      setFormData(prev => ({ ...prev, translations: updatedTranslations }));
      setStatus(`✅ Pole bylo úspěšně přeloženo a uloženo!`);
      
      // Aktualizovat i seznam zemí vlevo
      fetchCountries();
    } catch (err: unknown) {
      if (err instanceof Error) setStatus('❌ Chyba překladu: ' + err.message);
    } finally {
      setTranslatingField(null);
    }
  };

  const deleteCountry = async (id: string) => {
    const { error } = await supabase.from('countries').delete().eq('id', id);
    if (!error) {
      resetForm();
      fetchCountries();
      setStatus('🗑️ Země byla kompletně smazána.');
    }
  };

  // NÁPOVĚDNÉ VLAJEČKY PRO JEDNOTLIVÁ POLE
  const renderFlags = (field: keyof CountryData) => {
    const targets = sourceLang === 'en' ? ['cs', 'de', 'es', 'fr'] : ['en', 'de', 'es', 'fr'];
    const flags: Record<string, string> = { cs: '🇨🇿', en: '🇬🇧', de: '🇩🇪', es: '🇪🇸', fr: '🇫🇷' };
    
    return (
      <div className="flex gap-1 mr-3">
        {targets.map(lang => {
          const isTranslated = !!formData.translations?.[lang]?.[field];
          return (
            <span 
              key={lang} 
              className={`text-sm transition-all ${isTranslated ? 'opacity-100 grayscale-0' : 'opacity-30 grayscale'}`} 
              title={isTranslated ? `Přeloženo do ${lang.toUpperCase()}` : `Chybí překlad do ${lang.toUpperCase()}`}
            >
              {flags[lang]}
            </span>
          );
        })}
      </div>
    );
  };

  const handleRegionChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    setRegionFormData({ ...regionFormData, [e.target.name]: e.target.value });
  };

  const selectRegion = (region: RegionData) => {
    setRegionFormData(region);
    setIsEditingRegion(true);
    setIsRegionActive(false);
    setRegionToDelete(null);

    setPlaceFormData({ region_id: region.id!, name: '', description: '', image_url: '' });
    setIsEditingPlace(false);
    setIsPlaceActive(false);
    setPlaceToDelete(null);

    fetchPlaces(region.id!);
    setStatus('');
  };

  const handleNewRegion = () => {
    setRegionFormData({ ...emptyRegion, country_id: formData.id });
    setIsEditingRegion(false);
    setIsRegionActive(true);
    setRegionToDelete(null);
    setPlaces([]);
  };

  const handleRegionSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setStatus('🤖 DeepL překládá region...');
    
    try {
      const allTexts = await translateRegionData({
        name: regionFormData.name,
        description: regionFormData.description,
        general_info: regionFormData.general_info || '',
        nature_and_landscapes: regionFormData.nature_and_landscapes || '',
        history_and_culture: regionFormData.history_and_culture || '',
        transport_and_life: regionFormData.transport_and_life || ''
      }, sourceLang);

      const { cs, ...translations } = allTexts;

      const dataToSave = {
        ...regionFormData,
        name: cs.name,
        description: cs.description,
        general_info: cs.general_info,
        nature_and_landscapes: cs.nature_and_landscapes,
        history_and_culture: cs.history_and_culture,
        transport_and_life: cs.transport_and_life,
        translations: translations
      };

      setStatus('Ukládám region...');
      const { error } = await supabase.from('regions').upsert([dataToSave]);
      if (error) throw error;
      
      setStatus('✅ Region přeložen a uložen!');
      fetchRegions(formData.id);
      setIsRegionActive(false);

    } catch (err: unknown) {
      if (err instanceof Error) setStatus('❌ Chyba: ' + err.message);
      else setStatus('❌ Neočekávaná chyba.');
    }
  };

  const deleteRegion = async (id: string) => {
    await supabase.from('regions').delete().eq('id', id);
    fetchRegions(formData.id);
    handleNewRegion();
    setStatus('🗑️ Region smazán.');
  };

  const handlePlaceChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    setPlaceFormData({ ...placeFormData, [e.target.name]: e.target.value });
  };

  const selectPlace = (place: PlaceData) => {
    setPlaceFormData(place);
    setIsEditingPlace(true);
    setIsPlaceActive(false);
    setPlaceToDelete(null);
    setStatus('');
  };

  const handleNewPlace = () => {
    setPlaceFormData({ region_id: regionFormData.id!, name: '', description: '', image_url: '' });
    setIsEditingPlace(false);
    setIsPlaceActive(true);
    setPlaceToDelete(null);
  };

  const handlePlaceSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setStatus('Ukládám místo...');
    const { error } = await supabase.from('places').upsert([placeFormData]);
    if (error) setStatus('❌ Chyba místa: ' + error.message);
    else {
      setStatus('✅ Místo uloženo!');
      fetchPlaces(regionFormData.id!);
      setIsPlaceActive(false);
    }
  };

  const deletePlace = async (id: string) => {
    await supabase.from('places').delete().eq('id', id);
    fetchPlaces(regionFormData.id!);
    handleNewPlace();
    setStatus('🗑️ Místo smazáno.');
  };

  if (!session) {
    return (
      <main className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <form onSubmit={handleLogin} className="bg-white p-8 rounded-2xl shadow-lg max-w-sm w-full">
          <h1 className="text-2xl font-bold text-blue-900 mb-6 text-center">Přihlášení</h1>
          <div className="space-y-4">
            <input type="email" placeholder="E-mail" value={email} onChange={(e) => setEmail(e.target.value)} required className="w-full border rounded-lg p-3" />
            <input type="password" placeholder="Heslo" value={password} onChange={(e) => setPassword(e.target.value)} required className="w-full border rounded-lg p-3" />
            {authError && <p className="text-red-600 text-sm text-center">{authError}</p>}
            <button type="submit" className="w-full bg-blue-900 text-white font-bold py-3 rounded-xl">Vstoupit</button>
          </div>
        </form>
      </main>
    );
  }

  const inputClass = "w-full border rounded-lg p-3 text-sm transition-colors disabled:bg-transparent disabled:border-transparent disabled:text-gray-800 disabled:font-medium disabled:px-0 bg-white focus:ring-2 focus:ring-blue-200 outline-none";

  return (
    <main className="min-h-screen bg-gray-50 text-gray-900 py-12 px-4">
      <div className="max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-4 gap-8">
        
        {/* LEVÝ PANEL: Země */}
        <div className="lg:col-span-1 space-y-4">
          <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 sticky top-24">
            <div className="flex justify-between items-center mb-4">
              <h2 className="font-bold text-xl text-blue-900">Země</h2>
              <button onClick={resetForm} className="text-xs bg-blue-100 text-blue-700 px-3 py-1 rounded-full font-bold">+ Nová</button>
            </div>
            <div className="space-y-2 max-h-[70vh] overflow-y-auto pr-2">
              {countries.map(c => (
                <div key={c.id} onClick={() => selectCountry(c)} className={`p-3 rounded-xl border cursor-pointer transition-all flex items-center gap-3 ${formData.id === c.id ? 'border-blue-500 bg-blue-50 shadow-sm' : 'border-gray-100 hover:bg-gray-50'}`}>
                  <span className="text-2xl">{c.flag}</span>
                  <span className="font-medium flex-grow truncate">{c.name}</span>
                </div>
              ))}
            </div>
            <button onClick={handleLogout} className="w-full mt-6 text-gray-400 text-xs hover:underline">Odhlásit se</button>
          </div>
        </div>

        {/* PRAVÝ PANEL: Formuláře */}
        <div className="lg:col-span-3 space-y-8">
          
          {/* PŘEPÍNAČ JAZYKA */}
          <div className="bg-white p-4 rounded-2xl shadow-sm border border-gray-100 flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="font-bold text-blue-900">V jakém jazyce vkládáš texty?</div>
            <div className="flex bg-gray-100 rounded-lg p-1 w-full sm:w-auto">
              <button
                onClick={() => setSourceLang('en')}
                className={`flex-1 sm:flex-none px-6 py-2 rounded-md font-bold text-sm transition-colors ${sourceLang === 'en' ? 'bg-white text-blue-900 shadow-sm' : 'text-gray-500 hover:text-gray-900'}`}
              >
                🇬🇧 Angličtina
              </button>
              <button
                onClick={() => setSourceLang('cs')}
                className={`flex-1 sm:flex-none px-6 py-2 rounded-md font-bold text-sm transition-colors ${sourceLang === 'cs' ? 'bg-white text-blue-900 shadow-sm' : 'text-gray-500 hover:text-gray-900'}`}
              >
                🇨🇿 Čeština
              </button>
            </div>
          </div>

          {/* FORMULÁŘ ZEMĚ */}
          <form onSubmit={handleSubmit} className="bg-white p-8 rounded-2xl shadow-sm border border-gray-100 space-y-6">
            <div className="flex justify-between items-center border-b pb-4">
              <h2 className="text-2xl font-bold text-blue-900">
                {isEditing ? formData.name : 'Přidat novou zemi'}
              </h2>
              {isEditing && !isCountryActive && (
                <button type="button" onClick={() => setIsCountryActive(true)} className="bg-blue-50 text-blue-700 px-4 py-2 rounded-lg font-bold text-sm hover:bg-blue-100">
                  ✏️ Upravit zemi
                </button>
              )}
            </div>
            
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 bg-gray-50/50 p-4 rounded-xl">
              <div className="col-span-2 lg:col-span-1">
                <label className="text-xs font-bold text-gray-400 uppercase">ID (ESP)</label>
                <input required disabled={isEditing} name="id" value={formData.id} onChange={handleChange} className={inputClass} />
              </div>
              <div className="col-span-2 lg:col-span-1">
                <div className="flex justify-between items-end mb-1">
                  <label className="text-xs font-bold text-gray-400 uppercase">Název</label>
                  {isEditing && (
                    <div className="flex items-center">
                      {renderFlags('name')}
                      <button type="button" onClick={() => handleTranslateSingle('name')} disabled={translatingField === 'name'} className="text-xs bg-blue-100 text-blue-700 px-2 py-1 rounded hover:bg-blue-200">
                        {translatingField === 'name' ? '...' : '🤖'}
                      </button>
                    </div>
                  )}
                </div>
                <input required disabled={!isCountryActive} name="name" value={formData.name} onChange={handleChange} className={inputClass} />
              </div>
              <div className="col-span-2 lg:col-span-1">
                <label className="text-xs font-bold text-gray-400 uppercase">Vlajka</label>
                <input required disabled={!isCountryActive} name="flag" value={formData.flag} onChange={handleChange} className={inputClass} />
              </div>
              <div className="col-span-2 lg:col-span-1">
                <label className="text-xs font-bold text-gray-400 uppercase">URL Hlavní fotky</label>
                <input disabled={!isCountryActive} name="image_url" value={formData.image_url} onChange={handleChange} className={inputClass} />
              </div>
              
              <div className="col-span-2 lg:col-span-4">
                <div className="flex justify-between items-end mb-1">
                  <label className="text-xs font-bold text-gray-400 uppercase">Popis</label>
                  {isEditing && (
                    <div className="flex items-center">
                      {renderFlags('description')}
                      <button type="button" onClick={() => handleTranslateSingle('description')} disabled={translatingField === 'description' || !formData.description} className="text-xs bg-blue-100 text-blue-700 px-2 py-1 rounded hover:bg-blue-200 disabled:opacity-50">
                        {translatingField === 'description' ? 'Překládám...' : '🤖 Přeložit'}
                      </button>
                    </div>
                  )}
                </div>
                <input required disabled={!isCountryActive} name="description" value={formData.description} onChange={handleChange} className={inputClass} />
              </div>

              {['general_info', 'travel_tourism', 'life_work', 'culture_food'].map(field => {
                const key = field as keyof CountryData;
                return (
                  <div key={field} className="col-span-2 lg:col-span-2 mt-4 border-t border-gray-100 pt-4">
                    <div className="flex justify-between items-end mb-2">
                      <label className="text-xs font-bold text-gray-400 uppercase">{field.replace('_', ' ')}</label>
                      {/* ZDE JE KOUZLO: Vlaječky a nezávislé tlačítko přeložit */}
                      {isEditing && (
                        <div className="flex items-center">
                          {renderFlags(key)}
                          <button 
                            type="button" 
                            onClick={() => handleTranslateSingle(key)} 
                            disabled={translatingField === key || !formData[key]} 
                            className="text-xs bg-blue-100 text-blue-700 px-2 py-1 rounded hover:bg-blue-200 disabled:opacity-50 font-bold"
                          >
                            {translatingField === key ? 'Překládám...' : '🤖 Přeložit'}
                          </button>
                        </div>
                      )}
                    </div>
                    <textarea disabled={!isCountryActive} name={field} value={formData[key] as string} onChange={handleChange} rows={6} className={inputClass} />
                  </div>
                );
              })}
            </div>
            
            {isCountryActive && (
              <div className="flex gap-4 pt-4">
                <button type="submit" className="flex-grow bg-blue-900 text-white font-bold py-4 rounded-xl hover:bg-blue-800">Uložit základní texty</button>
                {isEditing && (
                  !countryToDelete ? (
                    <button type="button" onClick={() => setCountryToDelete(true)} className="bg-gray-100 text-gray-600 px-6 rounded-xl font-bold hover:bg-gray-200">Smazat</button>
                  ) : (
                    <button type="button" onClick={() => deleteCountry(formData.id)} className="bg-red-500 text-white px-6 rounded-xl font-bold hover:bg-red-600 animate-pulse">Opravdu?</button>
                  )
                )}
              </div>
            )}
          </form>

          {/* DRUHÉ PATRO: REGIONY */}
          {isEditing && (
            <div className="bg-white p-8 rounded-2xl shadow-sm border border-gray-100 space-y-6">
              <div className="flex justify-between items-center border-b pb-4">
                <h2 className="text-2xl font-bold text-yellow-600 flex items-center gap-2"><span>🗺️</span> Regiony</h2>
                <button onClick={handleNewRegion} className="bg-yellow-100 text-yellow-800 px-3 py-1 rounded-full font-bold text-sm hover:bg-yellow-200">+ Nový region</button>
              </div>
              
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                {regions.map(r => (
                  <div key={r.id} onClick={() => selectRegion(r)} className={`p-3 rounded-xl border cursor-pointer flex justify-between items-center transition-all ${regionFormData.id === r.id ? 'border-yellow-500 bg-yellow-50 shadow-sm' : 'border-gray-100 hover:bg-gray-50'}`}>
                    <div>
                      <div className="font-bold truncate">{r.name}</div>
                      <div className="text-xs text-gray-500">{r.language}</div>
                    </div>
                    {regionToDelete === r.id ? (
                      <button type="button" onClick={(e) => { e.stopPropagation(); deleteRegion(r.id!); }} className="text-white bg-red-500 px-2 py-1 rounded text-xs font-bold shadow-md animate-pulse">Opravdu?</button>
                    ) : (
                      <button type="button" onClick={(e) => { e.stopPropagation(); setRegionToDelete(r.id!); }} className="text-red-300 hover:text-red-500 text-lg">🗑️</button>
                    )}
                  </div>
                ))}
              </div>

              {(isEditingRegion || isRegionActive) && (
                <form onSubmit={handleRegionSubmit} className="bg-yellow-50/50 p-6 rounded-xl border border-yellow-100 space-y-4">
                  <div className="flex justify-between items-center mb-2">
                    <h3 className="font-bold text-yellow-800">{isEditingRegion ? `Region: ${regionFormData.name}` : 'Nový region'}</h3>
                    {isEditingRegion && !isRegionActive && (
                      <button type="button" onClick={() => setIsRegionActive(true)} className="text-blue-600 text-sm font-bold hover:underline">✏️ Upravit</button>
                    )}
                  </div>
                  
                  <div className="grid grid-cols-2 gap-4">
                    <div className="col-span-2 md:col-span-1">
                      <label className="text-xs font-bold text-yellow-700 uppercase">Název regionu</label>
                      <input required disabled={!isRegionActive} name="name" value={regionFormData.name} onChange={handleRegionChange} className={inputClass} />
                    </div>
                    <div className="col-span-2 md:col-span-1">
                      <label className="text-xs font-bold text-yellow-700 uppercase">Jazyk(y)</label>
                      <input disabled={!isRegionActive} name="language" value={regionFormData.language} onChange={handleRegionChange} className={inputClass} />
                    </div>
                    <div className="col-span-2">
                      <label className="text-xs font-bold text-yellow-700 uppercase">Foto URL</label>
                      <input disabled={!isRegionActive} name="image_url" value={regionFormData.image_url} onChange={handleRegionChange} className={inputClass} />
                    </div>
                    <div className="col-span-2">
                      <label className="text-xs font-bold text-yellow-700 uppercase">Krátký popis</label>
                      <textarea required disabled={!isRegionActive} name="description" value={regionFormData.description} onChange={handleRegionChange} rows={2} className={inputClass} />
                    </div>
                    
                    <div className="col-span-2 mt-4 pt-4 border-t border-yellow-200 grid grid-cols-2 gap-4">
                      <h4 className="col-span-2 font-bold text-yellow-800 text-xs uppercase tracking-wider">📝 Detailní texty</h4>
                      
                      <div className="col-span-2">
                        <label className="text-xs font-bold text-gray-500 uppercase">Obecně o regionu</label>
                        <textarea disabled={!isRegionActive} name="general_info" value={regionFormData.general_info || ''} onChange={handleRegionChange} rows={4} className={inputClass} />
                      </div>
                      <div className="col-span-2">
                        <label className="text-xs font-bold text-gray-500 uppercase">Výlety a příroda</label>
                        <textarea disabled={!isRegionActive} name="nature_and_landscapes" value={regionFormData.nature_and_landscapes || ''} onChange={handleRegionChange} rows={4} className={inputClass} />
                      </div>
                      <div className="col-span-2">
                        <label className="text-xs font-bold text-gray-500 uppercase">Gastronomie a atmosféra</label>
                        <textarea disabled={!isRegionActive} name="history_and_culture" value={regionFormData.history_and_culture || ''} onChange={handleRegionChange} rows={4} className={inputClass} />
                      </div>
                      <div className="col-span-2">
                        <label className="text-xs font-bold text-gray-500 uppercase">Pro koho to je a děti</label>
                        <textarea disabled={!isRegionActive} name="transport_and_life" value={regionFormData.transport_and_life || ''} onChange={handleRegionChange} rows={4} className={inputClass} />
                      </div>
                    </div>

                    <div className="col-span-2 mt-4 pt-4 border-t border-yellow-200">
                      <h4 className="font-bold text-yellow-800 mb-4 text-xs uppercase tracking-wider">🌡️ Průměrné teploty (°C)</h4>
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                        <div className="space-y-2 bg-white/50 p-3 rounded-lg">
                          <label className="text-xs font-bold text-gray-500 flex items-center gap-1">🌸 Jaro</label>
                          <input disabled={!isRegionActive} placeholder="Vzduch (např. 18-22)" name="temp_spring_air" value={regionFormData.temp_spring_air || ''} onChange={handleRegionChange} className={`${inputClass} !p-2 !text-xs`} title="Vzduch" />
                          <input disabled={!isRegionActive} placeholder="Moře (např. 16)" name="temp_spring_sea" value={regionFormData.temp_spring_sea || ''} onChange={handleRegionChange} className={`${inputClass} !p-2 !text-xs`} title="Moře" />
                        </div>
                        <div className="space-y-2 bg-white/50 p-3 rounded-lg">
                          <label className="text-xs font-bold text-gray-500 flex items-center gap-1">☀️ Léto</label>
                          <input disabled={!isRegionActive} placeholder="Vzduch (např. 28-35)" name="temp_summer_air" value={regionFormData.temp_summer_air || ''} onChange={handleRegionChange} className={`${inputClass} !p-2 !text-xs`} />
                          <input disabled={!isRegionActive} placeholder="Moře (např. 24)" name="temp_summer_sea" value={regionFormData.temp_summer_sea || ''} onChange={handleRegionChange} className={`${inputClass} !p-2 !text-xs`} />
                        </div>
                        <div className="space-y-2 bg-white/50 p-3 rounded-lg">
                          <label className="text-xs font-bold text-gray-500 flex items-center gap-1">🍂 Podzim</label>
                          <input disabled={!isRegionActive} placeholder="Vzduch (např. 20-25)" name="temp_autumn_air" value={regionFormData.temp_autumn_air || ''} onChange={handleRegionChange} className={`${inputClass} !p-2 !text-xs`} />
                          <input disabled={!isRegionActive} placeholder="Moře (např. 21)" name="temp_autumn_sea" value={regionFormData.temp_autumn_sea || ''} onChange={handleRegionChange} className={`${inputClass} !p-2 !text-xs`} />
                        </div>
                        <div className="space-y-2 bg-white/50 p-3 rounded-lg">
                          <label className="text-xs font-bold text-gray-500 flex items-center gap-1">❄️ Zima</label>
                          <input disabled={!isRegionActive} placeholder="Vzduch (např. 12-16)" name="temp_winter_air" value={regionFormData.temp_winter_air || ''} onChange={handleRegionChange} className={`${inputClass} !p-2 !text-xs`} />
                          <input disabled={!isRegionActive} placeholder="Moře (např. 14)" name="temp_winter_sea" value={regionFormData.temp_winter_sea || ''} onChange={handleRegionChange} className={`${inputClass} !p-2 !text-xs`} />
                        </div>
                      </div>
                    </div>
                  </div>
                  
                  {isRegionActive && (
                    <div className="flex gap-3 mt-4">
                      <button type="submit" className="flex-grow bg-yellow-500 text-white font-bold py-3 rounded-lg hover:bg-yellow-600">Uložit a přeložit</button>
                      <button type="button" onClick={() => { setIsRegionActive(false); if (!isEditingRegion) handleNewRegion(); }} className="bg-gray-200 text-gray-700 px-4 rounded-lg font-bold hover:bg-gray-300">Zrušit</button>
                    </div>
                  )}
                </form>
              )}
            </div>
          )}

          {/* TŘETÍ PATRO: MÍSTA */}
          {isEditingRegion && regionFormData.id && (
            <div className="bg-white p-8 rounded-2xl shadow-sm border border-gray-100 space-y-6">
              <div className="flex justify-between items-center border-b pb-4">
                <h2 className="text-xl font-bold text-green-700 flex items-center gap-2"><span>📍</span> Místa ({regionFormData.name})</h2>
                <button onClick={handleNewPlace} className="bg-green-100 text-green-800 px-3 py-1 rounded-full font-bold text-sm hover:bg-green-200">+ Nové místo</button>
              </div>
              
              {places.length > 0 ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {places.map(p => (
                    <div key={p.id} onClick={() => selectPlace(p)} className={`p-3 rounded-xl border cursor-pointer flex justify-between items-center transition-all ${placeFormData.id === p.id ? 'border-green-500 bg-green-50 shadow-sm' : 'border-gray-100 hover:bg-gray-50'}`}>
                      <div className="font-bold truncate">{p.name}</div>
                      {placeToDelete === p.id ? (
                        <button type="button" onClick={(e) => { e.stopPropagation(); deletePlace(p.id!); }} className="text-white bg-red-500 px-2 py-1 rounded text-xs font-bold shadow-md animate-pulse">Opravdu?</button>
                      ) : (
                        <button type="button" onClick={(e) => { e.stopPropagation(); setPlaceToDelete(p.id!); }} className="text-red-300 hover:text-red-500 text-lg">🗑️</button>
                      )}
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-gray-400 text-sm italic">Zatím tu nejsou žádná místa. Přidejte první!</p>
              )}

              {(isEditingPlace || isPlaceActive) && (
                <form onSubmit={handlePlaceSubmit} className="bg-green-50/50 p-6 rounded-xl border border-green-100 space-y-4">
                  <div className="flex justify-between items-center mb-2">
                    <h3 className="font-bold text-green-800">{isEditingPlace ? `Místo: ${placeFormData.name}` : 'Nové místo'}</h3>
                    {isEditingPlace && !isPlaceActive && (
                      <button type="button" onClick={() => setIsPlaceActive(true)} className="text-blue-600 text-sm font-bold hover:underline">✏️ Upravit</button>
                    )}
                  </div>
                  
                  <div className="grid grid-cols-2 gap-4">
                    <input required disabled={!isPlaceActive} placeholder="Název (např. Sevilla)" name="name" value={placeFormData.name} onChange={handlePlaceChange} className={`col-span-2 md:col-span-1 ${inputClass}`} />
                    <input disabled={!isPlaceActive} placeholder="Foto URL" name="image_url" value={placeFormData.image_url} onChange={handlePlaceChange} className={`col-span-2 md:col-span-1 ${inputClass}`} />
                    <textarea required disabled={!isPlaceActive} placeholder="Popis místa..." name="description" value={placeFormData.description} onChange={handlePlaceChange} rows={3} className={`col-span-2 ${inputClass}`} />
                  </div>
                  
                  {isPlaceActive && (
                    <div className="flex gap-3 mt-4">
                      <button type="submit" className="flex-grow bg-green-600 text-white font-bold py-3 rounded-lg hover:bg-green-700">Uložit místo</button>
                      <button type="button" onClick={() => { setIsPlaceActive(false); if (!isEditingPlace) handleNewPlace(); }} className="bg-gray-200 text-gray-700 px-4 rounded-lg font-bold hover:bg-gray-300">Zrušit</button>
                    </div>
                  )}
                </form>
              )}
            </div>
          )}

          {status && (
            <div className={`p-4 rounded-lg font-bold sticky bottom-4 z-50 text-center shadow-lg transition-all ${status.includes('❌') ? 'bg-red-100 text-red-800 border border-red-200' : 'bg-green-100 text-green-800 border border-green-200'}`}>
              {status}
            </div>
          )}

        </div>
      </div>
    </main>
  );
}