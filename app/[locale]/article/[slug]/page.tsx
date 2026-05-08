import { createClient } from '@supabase/supabase-js';
import { notFound } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import ReactMarkdown from 'react-markdown';
// import { getTranslations } from 'next-intl/server'; // Odkomentuj, pokud máš slovník pro společné výrazy

// Inicializace Supabase
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const supabase = createClient(supabaseUrl, supabaseKey);

type TranslationData = Record<string, { title?: string; content?: string }>;

// 🚀 1. Generování SEO Metadat (aby tě Google miloval)
export async function generateMetadata({ params }: { params: Promise<{ locale: string; slug: string }> }) {
  const resolvedParams = await params;
  const { locale, slug } = resolvedParams;
  
  const { data: article } = await supabase
    .from('articles')
    .select('title, content, image_url, translations')
    .eq('slug', slug)
    .single();

  if (!article) return { title: 'Článek nenalezen | Euvida' };

  const allTranslations = article.translations as TranslationData | null;
  const isDefaultLocale = locale === 'cs';
  const localizedTitle = isDefaultLocale ? article.title : allTranslations?.[locale]?.title || article.title;
  
  // Vytáhneme kousek textu z obsahu pro meta description
  const rawContent = isDefaultLocale ? article.content : allTranslations?.[locale]?.content || article.content;
  const shortDescription = rawContent ? rawContent.substring(0, 160) + '...' : 'Přečtěte si článek na Euvida.eu';

  return {
    title: `${localizedTitle} | Euvida`,
    description: shortDescription,
    openGraph: {
      title: localizedTitle,
      description: shortDescription,
      images: [{ url: article.image_url || '/og-default.jpg' }],
    },
  };
}

// 📖 2. Samotná stránka článku
export default async function ArticlePage({ params }: { params: Promise<{ locale: string; slug: string }> }) {
  const resolvedParams = await params;
  const { locale, slug } = resolvedParams;
  
  // const t = await getTranslations('Common'); // Pro tlačítko "Zpět" atd. - použijeme zatím natvrdo nebo si to dopřeložíš

  // Vytáhneme článek z DB
  const { data: article } = await supabase
    .from('articles')
    .select('*')
    .eq('slug', slug)
    .single();

  if (!article) notFound();

  // Vyřešení překladů
  const allTranslations = article.translations as TranslationData | null;
  const isDefaultLocale = locale === 'cs';
  const localizedTitle = isDefaultLocale ? article.title : allTranslations?.[locale]?.title || article.title;
  const localizedContent = isDefaultLocale ? article.content : allTranslations?.[locale]?.content || article.content;

  // Nastavení, jak se má formátovat Markdown text článku (odrážky, nadpisy, atd.)
  const markdownComponents = {
    p: (props: React.ComponentPropsWithoutRef<'p'>) => <p className="text-gray-800 text-lg leading-relaxed mb-6" {...props} />,
    h2: (props: React.ComponentPropsWithoutRef<'h2'>) => <h2 className="text-3xl font-extrabold text-blue-900 mt-12 mb-6" {...props} />,
    h3: (props: React.ComponentPropsWithoutRef<'h3'>) => <h3 className="text-2xl font-bold text-gray-900 mt-8 mb-4" {...props} />,
    strong: (props: React.ComponentPropsWithoutRef<'strong'>) => <strong className="font-bold text-blue-900" {...props} />,
    ul: (props: React.ComponentPropsWithoutRef<'ul'>) => <ul className="list-disc pl-6 mb-6 text-gray-800 text-lg space-y-2" {...props} />,
    li: (props: React.ComponentPropsWithoutRef<'li'>) => <li {...props} />,
  };

  return (
    <main className="min-h-screen bg-white font-sans pb-24">
      {/* Plovoucí navigace - Zpět (Zatím odkazuje na domovskou stránku, později můžeme napojit např. přímo na zemi/region) */}
      <div className="absolute top-6 left-0 right-0 z-30 px-4">
        <div className="max-w-4xl mx-auto flex items-center justify-between">
          <Link href={`/${locale}`} className="inline-flex items-center gap-2 bg-white/90 backdrop-blur-sm px-5 py-2.5 rounded-full text-blue-900 font-bold hover:bg-white shadow-md hover:shadow-lg transition-all">
            &larr; Zpět
          </Link>
        </div>
      </div>

      <article>
        {/* Hlavička článku s fotkou */}
        <header className="relative w-full h-[55vh] min-h-[450px] max-h-[700px] flex flex-col justify-end">
          {article.image_url ? (
            <Image
              src={article.image_url}
              alt={localizedTitle}
              fill
              className="object-cover"
              priority
            />
          ) : (
            <div className="w-full h-full absolute inset-0 bg-blue-900" />
          )}
          
          {/* Tmavý gradient, aby byl dobře čitelný nadpis */}
          <div className="absolute inset-0 bg-gradient-to-t from-slate-900 via-slate-900/40 to-transparent" />
          
          <div className="relative z-10 px-6 pb-12 md:pb-16 max-w-4xl mx-auto text-center w-full">
            {article.category && (
              <span className="inline-block bg-yellow-400 text-blue-900 font-extrabold text-sm px-4 py-1.5 rounded-full uppercase tracking-wider mb-6 shadow-sm">
                {article.category}
              </span>
            )}
            <h1 className="text-4xl md:text-6xl font-black text-white drop-shadow-md tracking-tight leading-tight">
              {localizedTitle}
            </h1>
          </div>
        </header>

        {/* Samotný obsah článku */}
        <div className="max-w-3xl mx-auto px-6 mt-12 md:mt-16">
          <ReactMarkdown components={markdownComponents}>
            {localizedContent}
          </ReactMarkdown>
        </div>
      </article>
    </main>
  );
}