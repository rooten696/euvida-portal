'use client';

import { getDestinationLabel } from '@/lib/destinationLabels';
import { supabase } from '@/lib/supabaseBrowserClient';
import { useRouter } from 'next/navigation';
import { useCallback, useEffect, useState } from 'react';

type FavoriteButtonProps = {
  countryId?: string;
  regionId?: string;
  articleSlug?: string;
  locale?: string;
};

const getLocalFavorites = (uid: string | null) => {
  if (typeof window === 'undefined') return { countries: [], regions: [], articles: [] };
  const key = `euvida_favs_${uid || 'guest'}`;
  try {
    const data = localStorage.getItem(key);
    return data ? JSON.parse(data) : { countries: [], regions: [], articles: [] };
  } catch (e) {
    return { countries: [], regions: [], articles: [] };
  }
};

const saveLocalFavorites = (uid: string | null, favs: any) => {
  if (typeof window === 'undefined') return;
  const key = `euvida_favs_${uid || 'guest'}`;
  try {
    localStorage.setItem(key, JSON.stringify(favs));
  } catch (e) {}
};

export default function FavoriteButton({
  countryId,
  regionId,
  articleSlug,
  locale = 'cs',
}: FavoriteButtonProps) {
  const [isFavorite, setIsFavorite] = useState(false);
  const [loading, setLoading] = useState(true);
  const [userId, setUserId] = useState<string | null>(null);
  const router = useRouter();

  const checkFavorite = useCallback(
    async (uid: string) => {
      if (countryId) {
        const { data, error } = await supabase
          .from('favorites')
          .select('id')
          .eq('user_id', uid)
          .eq('country_id', countryId)
          .single();

        if (data && !error) {
          setIsFavorite(true);
        }
      } else if (regionId) {
        const favs = getLocalFavorites(uid);
        if (favs.regions?.includes(regionId)) {
          setIsFavorite(true);
        }
      } else if (articleSlug) {
        const favs = getLocalFavorites(uid);
        if (favs.articles?.includes(articleSlug)) {
          setIsFavorite(true);
        }
      }

      setLoading(false);
    },
    [countryId, regionId, articleSlug]
  );

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.user) {
        setUserId(session.user.id);
        checkFavorite(session.user.id);
      } else {
        setLoading(false);
      }
    });
  }, [checkFavorite]);

  const toggleFavorite = async () => {
    if (!userId) {
      router.push(`/${locale}/login`);
      return;
    }

    if (countryId) {
      if (isFavorite) {
        const { error } = await supabase
          .from('favorites')
          .delete()
          .eq('user_id', userId)
          .eq('country_id', countryId);

        if (!error) {
          setIsFavorite(false);
          const favs = getLocalFavorites(userId);
          favs.countries = (favs.countries || []).filter((id: string) => id !== countryId);
          saveLocalFavorites(userId, favs);
        }
      } else {
        const { error } = await supabase
          .from('favorites')
          .insert([{ user_id: userId, country_id: countryId }]);

        if (!error) {
          setIsFavorite(true);
          const favs = getLocalFavorites(userId);
          if (!favs.countries) favs.countries = [];
          if (!favs.countries.includes(countryId)) {
            favs.countries.push(countryId);
          }
          saveLocalFavorites(userId, favs);
        }
      }
    } else if (regionId) {
      const favs = getLocalFavorites(userId);
      if (!favs.regions) favs.regions = [];

      if (isFavorite) {
        favs.regions = favs.regions.filter((id: string) => id !== regionId);
        setIsFavorite(false);
      } else {
        if (!favs.regions.includes(regionId)) {
          favs.regions.push(regionId);
        }
        setIsFavorite(true);
      }
      saveLocalFavorites(userId, favs);
    } else if (articleSlug) {
      const favs = getLocalFavorites(userId);
      if (!favs.articles) favs.articles = [];

      if (isFavorite) {
        favs.articles = favs.articles.filter((slug: string) => slug !== articleSlug);
        setIsFavorite(false);
      } else {
        if (!favs.articles.includes(articleSlug)) {
          favs.articles.push(articleSlug);
        }
        setIsFavorite(true);
      }
      saveLocalFavorites(userId, favs);
    }
  };

  if (loading) {
    return <div className="h-11 w-40 animate-pulse rounded-full bg-white/30" />;
  }

  return (
    <button
      onClick={toggleFavorite}
      className={`inline-flex items-center justify-center gap-2 rounded-full border px-5 py-2.5 text-sm font-bold shadow-sm transition-all hover:shadow-md ${
        isFavorite
          ? 'border-red-100 bg-red-50 text-red-700'
          : 'border-white/40 bg-white/95 text-slate-700 hover:border-red-200'
      }`}
    >
      <span className={isFavorite ? 'text-red-500' : 'text-slate-400'} aria-hidden>
        {isFavorite ? '♥' : '+'}
      </span>
      {isFavorite
        ? getDestinationLabel(locale, 'savedFavorite')
        : getDestinationLabel(locale, 'addFavorite')}
    </button>
  );
}
