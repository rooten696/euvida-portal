'use client';

import { useState, useEffect } from 'react';

export default function WeatherWidget({ locationName }: { locationName: string }) {
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

  if (loading) return <div className="animate-pulse bg-blue-100/50 h-12 w-32 rounded-2xl"></div>;

  if (error || temp === null) {
    return (
      <div className="inline-flex items-center gap-2 bg-gray-100/80 backdrop-blur-sm border border-gray-200 text-gray-600 px-4 py-2 rounded-2xl shadow-sm text-sm font-medium">
        <span>☁️</span> 
        <div className="flex flex-col text-left">
          <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider leading-none">Počasí</span>
          <span className="leading-tight">Nedostupné</span>
        </div>
      </div>
    );
  }

  return (
    <div className="inline-flex items-center gap-2 bg-blue-50 border border-blue-100 text-blue-900 px-4 py-2 rounded-2xl shadow-sm hover:scale-105 transition-transform cursor-default">
      <span className="text-2xl drop-shadow-sm">🌤️</span>
      <div className="flex flex-col text-left">
        <span className="text-[10px] font-bold text-blue-600 uppercase tracking-wider leading-none">Aktuálně</span>
        <span className="font-extrabold text-lg leading-tight">{temp} °C</span>
      </div>
    </div>
  );
}