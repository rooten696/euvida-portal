'use client';

import { useState, useEffect } from 'react';

function extractCoordinates(gps: string): { latitude: number; longitude: number } | null {
  const match = gps.match(/(-?\d+\.\d+)[^\d-]+(-?\d+\.\d+)/);
  if (match) {
    return {
      latitude: parseFloat(match[1]),
      longitude: parseFloat(match[2]),
    };
  }
  const parts = gps.replace(/°/g, '').split(',');
  if (parts.length === 2) {
    const lat = parseFloat(parts[0]);
    const lon = parseFloat(parts[1]);
    if (!isNaN(lat) && !isNaN(lon)) {
      return { latitude: lat, longitude: lon };
    }
  }
  return null;
}

export default function WeatherWidget({ 
  locationName, 
  gps,
  fallbackLocations = [],
  dark = false 
}: { 
  locationName?: string | null; 
  gps?: string | null;
  fallbackLocations?: string[];
  dark?: boolean 
}) {
  const [temp, setTemp] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  const fallbackKey = JSON.stringify(fallbackLocations);

  useEffect(() => {
    const fetchWeather = async () => {
      try {
        let latitude: number | null = null;
        let longitude: number | null = null;

        // 1. Zkusit získat souřadnice přímo z GPS
        if (gps) {
          const coords = extractCoordinates(gps);
          if (coords) {
            latitude = coords.latitude;
            longitude = coords.longitude;
          }
        }

        // 2. Pokud nemáme GPS, zkusit geokódování lokace
        if ((latitude === null || longitude === null) && locationName) {
          const candidates = new Set<string>();
          
          // Cleaned address
          const cleanName = locationName.replace(/\s*\(.*?\)\s*/g, '').trim();
          if (cleanName) {
            candidates.add(cleanName);
            
            // Split by comma
            const commaParts = cleanName.split(',').map(p => p.trim()).filter(Boolean);
            for (const part of commaParts) {
              let cleaned = part.replace(/\b\d{3}\s?\d{2}\b/g, '');
              cleaned = cleaned.replace(/\b\d+\b/g, '');
              cleaned = cleaned.trim();
              if (cleaned) {
                candidates.add(cleaned);
                
                if (cleaned.includes('-')) {
                  const hyphenParts = cleaned.split('-').map(h => h.trim()).filter(Boolean);
                  for (const hp of hyphenParts) {
                    candidates.add(hp);
                  }
                }
              }
            }
          }

          // Fallback region or country names
          for (const fallback of fallbackLocations) {
            if (fallback) {
              const cleanFallback = fallback.replace(/\s*\(.*?\)\s*/g, '').trim();
              if (cleanFallback) candidates.add(cleanFallback);
            }
          }

          const candidateList = Array.from(candidates);

          for (const candidate of candidateList) {
            try {
              const geoRes = await fetch(`https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(candidate)}&count=1`);
              const geoData = await geoRes.json();
              
              if (geoData.results && geoData.results.length > 0) {
                latitude = geoData.results[0].latitude;
                longitude = geoData.results[0].longitude;
                break;
              }
            } catch (e) {
              console.error(`Error geocoding candidate "${candidate}":`, e);
            }
          }
        }

        if (latitude === null || longitude === null) {
          console.warn(`🌤️ Meteo API nenašlo žádné souřadnice.`);
          setError(true);
          setLoading(false);
          return;
        }

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
  }, [locationName, gps, fallbackKey]);

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