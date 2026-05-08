import Link from 'next/link';
import Image from 'next/image';
import { createClient } from '@supabase/supabase-js';

// Inicializace Supabase (pokud na to máš vlastní soubor např. lib/supabase, použij ten)
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const supabase = createClient(supabaseUrl, supabaseKey);

type Article = {
  id: string;
  slug: string;
  image_url: string;
  category: string;
  title: string;
  content: string;
  translations?: Record<string, { title?: string; content?: string }>;
  created_at: string;
};

type ArticleListProps = {
  locale: string;
  countryId?: string; // Volitelné: pro detail státu
  regionId?: string;  // Volitelné: pro detail regionu
  limit?: number;     // Volitelné: pro zobrazení např. jen 3 nejnovějších na hlavní stránce
};

export default async function ArticleList({ locale, countryId, regionId, limit }: ArticleListProps) {
  // 1. Sestavení dotazu do Supabase
  let query = supabase
    .from('articles')
    .select('*')
    .order('created_at', { ascending: false });

  // 2. Přidání filtrů podle toho, jaké parametry komponenta dostala
  if (countryId) {
    query = query.eq('country_id', countryId);
  }
  if (regionId) {
    query = query.eq('region_id', regionId);
  }
  if (limit) {
    query = query.limit(limit);
  }

  const { data: articles, error } = await query;

  if (error) {
    console.error('Chyba při načítání článků:', error);
    return null;
  }

  if (!articles || articles.length === 0) {
    return (
      <div className="text-center text-gray-500 py-8">
        Zatím zde nejsou žádné články.
      </div>
    );
  }

  // 3. Vykreslení mřížky s články
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mt-8">
      {articles.map((article: Article) => {
        // Tady si sáhneme pro správný překlad. 
        // Předpokládám, že výchozí jazyk v db (title/content) je čeština ('cs').
        const isDefaultLocale = locale === 'cs';
        const localizedTitle = isDefaultLocale 
          ? article.title 
          : article.translations?.[locale]?.title || article.title;
          
        const localizedContent = isDefaultLocale 
          ? article.content 
          : article.translations?.[locale]?.content || article.content;

        return (
          <Link 
            href={`/${locale}/article/${article.slug}`} 
            key={article.id}
            className="group flex flex-col bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden hover:shadow-md transition-shadow duration-300"
          >
     {/* Fotka článku */}
            {article.image_url && (
              <div className="aspect-[16/9] w-full overflow-hidden relative">
                {/* ZMĚNĚNO: Používáme Next.js Image s atributem fill */}
                <Image 
                  src={article.image_url} 
                  alt={localizedTitle || 'Obrázek k článku'} 
                  fill
                  sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
                  className="object-cover group-hover:scale-105 transition-transform duration-500"
                />
                {/* Štítek s kategorií */}
                {article.category && (
                  <div className="absolute top-3 left-3 bg-blue-900 text-white text-xs font-bold px-3 py-1 rounded-full uppercase tracking-wider">
                    {article.category}
                  </div>
                )}
              </div>
            )}
            {/* Textová část */}
            <div className="p-5 flex flex-col flex-grow">
              <h3 className="text-xl font-bold text-gray-900 mb-2 line-clamp-2 group-hover:text-blue-900 transition-colors">
                {localizedTitle}
              </h3>
              <p className="text-gray-600 text-sm line-clamp-3 mb-4 flex-grow">
                {/* Pokud bys ukládal HTML, musel bys použít dangerouslySetInnerHTML, 
                    pokud čistý text, stačí to takhle: */}
                {localizedContent}
              </p>
              
              <div className="text-blue-600 font-semibold text-sm flex items-center">
                Číst dál 
                <span className="ml-1 group-hover:translate-x-1 transition-transform">→</span>
              </div>
            </div>
          </Link>
        );
      })}
    </div>
  );
}