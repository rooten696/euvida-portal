'use client';

import { useState, useEffect } from 'react';

export default function WeatherWidget({ locationName, dark = false }: { locationName: string; dark?: boolean }) {
  const [temp, setTemp] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    const fetchWeather = async () => {
      try {
        // ZMĚNA: Odstraníme z názvu závorky a vyčistíme mezery
        // Např. "Madrid (Společenství)" se změní čistě na "Madrid"
        const cleanName = locationName.replace(/\s*\(.*?\)\s*/g, '').trim();
        
        const geoRes = await fetch(`https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(cleanName)}&count=1`);
        const geoData = await geoRes.json();

        if (!geoData.results || geoData.results.length === 0) {
          console.warn(`🌤️ Meteo API nenašlo lokaci: ${cleanName}`);
          setError(true);
          setLoading(false);
          return;
        }

        const { latitude, longitude } = geoData.results[0];

        const weatherRes = await fetch(`https://api.open-meteo.com/v1/forecast?latitude=${latitude}&longitude=${longitude}&current_weather=true`);
        const weatherData = await weatherRes.json();

        setTemp(weatherData.current_weather.temperature);
      } catch {
        setError(true);
      } finally {
        setLoading(false);
      }
    };

    fetchWeather();
  }, [locationName]);

  if (loading) {
    return <div className={`animate-pulse ${dark ? 'bg-slate-800/50' : 'bg-blue-100/50'} h-12 w-32 rounded-2xl`}></div>;
  }

  if (error || temp === null) {
    return (
      <div className={`inline-flex items-center gap-2 px-4 py-2 rounded-2xl shadow-sm text-sm font-medium border backdrop-blur-sm ${
        dark 
          ? 'bg-slate-900/60 border-white/10 text-slate-300' 
          : 'bg-gray-100/80 border-gray-200 text-gray-600'
      }`}>
        <span>☁️</span> 
        <div className="flex flex-col text-left">
          <span className={`text-[10px] font-bold uppercase tracking-wider leading-none ${dark ? 'text-slate-500' : 'text-gray-400'}`}>Počasí</span>
          <span className="leading-tight">Nedostupné</span>
        </div>
      </div>
    );
  }

  return (
    <div className={`inline-flex items-center gap-2 px-4 py-2 rounded-2xl shadow-sm hover:scale-105 transition-transform cursor-default border ${
      dark 
        ? 'bg-slate-900/60 border-white/10 text-white backdrop-blur-sm' 
        : 'bg-blue-50 border-blue-100 text-blue-900'
    }`}>
      <span className="text-2xl drop-shadow-sm">🌤️</span>
      <div className="flex flex-col text-left">
        <span className={`text-[10px] font-bold uppercase tracking-wider leading-none ${
          dark ? 'text-emerald-400' : 'text-blue-600'
        }`}>Aktuálně</span>
        <span className="font-extrabold text-lg leading-tight">{temp} °C</span>
      </div>
    </div>
  );
}