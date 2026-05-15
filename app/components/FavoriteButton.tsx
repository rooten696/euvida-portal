'use client';

import { getDestinationLabel } from '@/lib/destinationLabels';
import { createClient } from '@supabase/supabase-js';
import { useRouter } from 'next/navigation';
import { useCallback, useEffect, useState } from 'react';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

type FavoriteButtonProps = {
  countryId: string;
  locale?: string;
};

export default function FavoriteButton({
  countryId,
  locale = 'cs',
}: FavoriteButtonProps) {
  const [isFavorite, setIsFavorite] = useState(false);
  const [loading, setLoading] = useState(true);
  const [userId, setUserId] = useState<string | null>(null);
  const router = useRouter();

  const checkFavorite = useCallback(
    async (uid: string) => {
      const { data, error } = await supabase
        .from('favorites')
        .select('id')
        .eq('user_id', uid)
        .eq('country_id', countryId)
        .single();

      if (data && !error) {
        setIsFavorite(true);
      }

      setLoading(false);
    },
    [countryId]
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

    if (isFavorite) {
      const { error } = await supabase
        .from('favorites')
        .delete()
        .eq('user_id', userId)
        .eq('country_id', countryId);

      if (!error) {
        setIsFavorite(false);
      }
    } else {
      const { error } = await supabase
        .from('favorites')
        .insert([{ user_id: userId, country_id: countryId }]);

      if (!error) {
        setIsFavorite(true);
      }
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
