'use client';

import { useState, useEffect, useCallback } from 'react';
import { createClient } from '@supabase/supabase-js';
import { useRouter } from 'next/navigation';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

export default function FavoriteButton({ countryId }: { countryId: string }) {
  const [isFavorite, setIsFavorite] = useState(false);
  const [loading, setLoading] = useState(true);
  const [userId, setUserId] = useState<string | null>(null);
  const router = useRouter();

  // 1. Zjistíme, kdo je přihlášený a jestli už má tuto zemi v oblíbených
  const checkFavorite = useCallback(async (uid: string) => {
    const { data, error } = await supabase
      .from('favorites')
      .select('id')
      .eq('user_id', uid)
      .eq('country_id', countryId)
      .single();

    if (data && !error) setIsFavorite(true);
    setLoading(false);
  }, [countryId]);

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
      // Pokud není přihlášený, pošleme ho na login
      router.push('/login');
      return;
    }

    if (isFavorite) {
      // SMAZAT Z OBLÍBENÝCH
      const { error } = await supabase
        .from('favorites')
        .delete()
        .eq('user_id', userId)
        .eq('country_id', countryId);

      if (!error) setIsFavorite(false);
    } else {
      // PŘIDAT DO OBLÍBENÝCH
      const { error } = await supabase
        .from('favorites')
        .insert([{ user_id: userId, country_id: countryId }]);

      if (!error) setIsFavorite(true);
    }
  };

  if (loading) return <div className="w-10 h-10 animate-pulse bg-gray-200 rounded-full" />;

  return (
    <button
      onClick={toggleFavorite}
      className={`flex items-center gap-2 px-6 py-3 rounded-full font-bold transition-all shadow-md hover:shadow-lg ${
        isFavorite 
          ? 'bg-red-50 text-red-600 border-2 border-red-100' 
          : 'bg-white text-gray-600 border-2 border-gray-100 hover:border-red-200'
      }`}
    >
      <span className={isFavorite ? 'text-red-500' : 'text-gray-300'}>
        {isFavorite ? '❤️' : '🤍'}
      </span>
      {isFavorite ? 'Uloženo v oblíbených' : 'Přidat do oblíbených'}
    </button>
  );
}