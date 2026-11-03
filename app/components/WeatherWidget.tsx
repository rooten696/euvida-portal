'use client';

import { useState, useEffect } from 'react';
import {
  parseWeatherCoordinates,
  getVerifiedRegionWeather,
  toIso2CountryCode,
  filterGeocodingResultsByCountry,
} from '@/lib/weatherRegistry';
import { getDestinationLabel } from '@/lib/destinationLabels';
import { normalizeLocale } from '@/lib/articleLocalization';

export type WeatherWidgetProps = {
  locationName?: string | null;
  gps?: string | null;
  fallbackLocations?: string[];
  dark?: boolean;
  regionId?: string | null;
  countryId?: string | null;
  countryName?: string | null;
  locale?: string;
};

export default function WeatherWidget({
  locationName,
  gps,
  fallbackLocations = [],
  dark = false,
  regionId,
  countryId,
  countryName,
  locale = 'cs',
}: WeatherWidgetProps) {
  const [temp, setTemp] = useState<number | null>(null);
  const [resolvedPoint, setResolvedPoint] = useState<string | null>(null);
  const [resolvedCountry, setResolvedCountry] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  const fallbackKey = JSON.stringify(fallbackLocations);
  const currentLocale = normalizeLocale(locale);
  const labelWeather = getDestinationLabel(currentLocale, 'weather');
  const labelUnavailable = getDestinationLabel(currentLocale, 'weatherUnavailable');
  const labelCurrently = getDestinationLabel(currentLocale, 'weatherCurrently');

  useEffect(() => {
    let cancelled = false;
    const controller = new AbortController();

    // Reset state on location or coordinate changes to avoid stale/out-of-order race conditions
    setLoading(true);
    setError(false);
    setTemp(null);
    setResolvedPoint(null);
    setResolvedCountry(null);

    const resolveAndFetch = async () => {
      try {
        let latitude: number | null = null;
        let longitude: number | null = null;
        let point: string | null = null;
        let country: string | null = countryName || null;

        // 1. Explicit GPS takes priority (e.g. from article records)
        if (gps) {
          const parsed = parseWeatherCoordinates(gps);
          if (parsed) {
            latitude = parsed.latitude;
            longitude = parsed.longitude;
            point = locationName
              ? locationName.replace(/\s*\(.*?\)\s*/g, '').split(',')[0].trim()
              : null;
          }
        }

        // 2. Verified representative region point (by region ID)
        if ((latitude === null || longitude === null) && regionId) {
          const verified = getVerifiedRegionWeather(regionId);
          if (verified) {
            latitude = verified.latitude;
            longitude = verified.longitude;
            point = verified.pointName[currentLocale] || verified.pointName.cs || verified.pointName.en;
            // Keep country name if provided, but avoid showing raw ISO-2 code like "GR"
            if (!country && countryName) {
              country = countryName;
            }
          }
        }

        // 3. Fallback geocoding with strict country validation
        if ((latitude === null || longitude === null) && locationName) {
          const expectedIso2 = toIso2CountryCode(countryId);

          // Geocoding fallback requires a verified expected country to prevent foreign false matches
          if (expectedIso2) {
            const candidates = new Set<string>();

            const cleanName = locationName.replace(/\s*\(.*?\)\s*/g, '').trim();
            if (cleanName) {
              candidates.add(cleanName);

              const commaParts = cleanName.split(',').map((p) => p.trim()).filter(Boolean);
              for (const part of commaParts) {
                let cleaned = part.replace(/\b\d{3}\s?\d{2}\b/g, '');
                cleaned = cleaned.replace(/\b\d+\b/g, '');
                cleaned = cleaned.trim();
                if (cleaned) {
                  candidates.add(cleaned);

                  if (cleaned.includes('-')) {
                    const hyphenParts = cleaned.split('-').map((h) => h.trim()).filter(Boolean);
                    for (const hp of hyphenParts) {
                      candidates.add(hp);
                    }
                  }
                }
              }
            }

            // Also check specific non-country fallback names if provided
            const fallbacks: string[] = JSON.parse(fallbackKey);
            for (const fallback of fallbacks) {
              if (fallback && fallback !== countryName) {
                const cleanFallback = fallback.replace(/\s*\(.*?\)\s*/g, '').trim();
                if (cleanFallback) candidates.add(cleanFallback);
              }
            }

            for (const candidate of candidates) {
              if (cancelled) return;
              try {
                const geoUrl = `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(
                  candidate
                )}&count=10&countryCode=${encodeURIComponent(expectedIso2)}&language=${encodeURIComponent(currentLocale)}`;
                const geoRes = await fetch(geoUrl, { signal: controller.signal });
                if (!geoRes.ok) continue;

                const geoData = await geoRes.json();
                const filtered = filterGeocodingResultsByCountry(geoData.results, expectedIso2);
                if (filtered.length > 0) {
                  const match = filtered[0];
                  latitude = match.latitude;
                  longitude = match.longitude;
                  point = match.name;
                  if (!country && match.country) {
                    country = match.country;
                  }
                  break;
                }
              } catch {
                if (cancelled) return;
              }
            }
          }
        }

        if (latitude === null || longitude === null) {
          if (!cancelled) {
            setError(true);
            setLoading(false);
          }
          return;
        }

        if (cancelled) return;

        const weatherUrl = `https://api.open-meteo.com/v1/forecast?latitude=${latitude}&longitude=${longitude}&current_weather=true`;
        const weatherRes = await fetch(weatherUrl, { signal: controller.signal });
        if (!weatherRes.ok) {
          throw new Error(`Weather fetch HTTP error: ${weatherRes.status}`);
        }

        const weatherData = await weatherRes.json();
        if (
          !weatherData ||
          !weatherData.current_weather ||
          typeof weatherData.current_weather.temperature !== 'number' ||
          !Number.isFinite(weatherData.current_weather.temperature)
        ) {
          throw new Error('Invalid weather payload');
        }

        if (!cancelled) {
          setTemp(weatherData.current_weather.temperature);
          setResolvedPoint(point);
          setResolvedCountry(country);
          setLoading(false);
        }
      } catch {
        if (!cancelled) {
          setError(true);
          setLoading(false);
        }
      }
    };

    resolveAndFetch();

    return () => {
      cancelled = true;
      controller.abort();
    };
  }, [regionId, countryId, countryName, locationName, gps, currentLocale, fallbackKey]);

  if (loading) {
    return (
      <div
        data-testid="weather-loading"
        className={`animate-pulse ${dark ? 'bg-slate-800/50' : 'bg-blue-100/50'} h-12 min-w-32 px-4 rounded-2xl flex items-center justify-center`}
      >
        <span className="text-xs text-slate-400">...</span>
      </div>
    );
  }

  if (error || temp === null) {
    return (
      <div
        data-testid="weather-unavailable"
        className={`inline-flex items-center gap-2 px-4 py-2 rounded-2xl shadow-sm text-sm font-medium border backdrop-blur-sm ${
          dark
            ? 'bg-slate-900/60 border-white/10 text-slate-300'
            : 'bg-gray-100/80 border-gray-200 text-gray-600'
        }`}
      >
        <span>☁️</span>
        <div className="flex flex-col text-left">
          <span className={`text-[10px] font-bold uppercase tracking-wider leading-none ${dark ? 'text-slate-500' : 'text-gray-400'}`}>
            {labelWeather}
          </span>
          <span className="leading-tight">{labelUnavailable}</span>
        </div>
      </div>
    );
  }

  const locationDisplay = [resolvedPoint, resolvedCountry].filter(Boolean).join(', ');

  return (
    <div
      data-testid="weather-widget"
      className={`inline-flex items-center gap-2.5 px-4 py-2 rounded-2xl shadow-sm hover:scale-105 transition-transform cursor-default border ${
        dark
          ? 'bg-slate-900/60 border-white/10 text-white backdrop-blur-sm'
          : 'bg-blue-50 border-blue-100 text-blue-900'
      }`}
    >
      <span className="text-2xl drop-shadow-sm shrink-0">🌤️</span>
      <div className="flex flex-col text-left min-w-0">
        <div className="flex items-baseline gap-2">
          <span className={`text-[10px] font-bold uppercase tracking-wider leading-none ${
            dark ? 'text-emerald-400' : 'text-blue-600'
          }`}>
            {labelCurrently}
          </span>
          <span className="font-extrabold text-base leading-tight">
            {temp} °C
          </span>
        </div>
        {locationDisplay && (
          <span
            data-testid="weather-location-name"
            title={locationDisplay}
            className={`text-[11px] leading-tight truncate max-w-[200px] font-medium ${
              dark ? 'text-slate-300' : 'text-blue-900/70'
            }`}
          >
            {locationDisplay}
          </span>
        )}
      </div>
    </div>
  );
}
