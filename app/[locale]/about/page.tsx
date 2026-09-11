import { supportedLocales, type SupportedLocale } from '@/lib/articleTypes';
import { setRequestLocale } from 'next-intl/server';
import type { Metadata } from 'next';
import Link from 'next/link';

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://euvida.eu';

export async function generateStaticParams() {
  return supportedLocales.map((locale) => ({ locale }));
}

export const revalidate = 86400;

type PageProps = {
  params: Promise<{ locale: string }>;
};

const contentByLocale = {
  cs: {
    title: 'O projektu Euvida',
    subtitle: 'Katalog a plánovač evropských bikeparků a trailcenter.',
    description:
      'Euvida.eu se zaměřuje na poskytování ověřených a praktických informací o evropských bikeparcích, trailových lokalitách a zázemí pro horská kola. Pomáháme bikerům plánovat výjezdy za ježděním bez zbytečného tápání.',
    categoriesTitle: 'Co v katalogu najdete?',
    categories: [
      {
        icon: '🚡',
        title: 'Lanovky & vleky',
        desc: 'Detailní přehled o provozu lanovek, gondol, vleků a shuttlů pro přepravu kol.',
      },
      {
        icon: '🚵',
        title: 'Tratě & náročnost',
        desc: 'Profily lokalit od mírných rodinných flowtrailů až po technické downhillové a enduro tratě.',
      },
      {
        icon: '🔧',
        title: 'Půjčovny, servis & zázemí',
        desc: 'Dostupnost půjčoven sjezdových i trailových kol, servisních stanic a myček kol.',
      },
      {
        icon: '🗺️',
        title: 'Mapy, skipasy & sezona',
        desc: 'Přímé odkazy na mapy trailů, otevírací kalendáře, ceny permic a praktické tipy pro cestu.',
      },
    ],
    highlightTitle: 'Proč plánovat výlety s Euvida.eu?',
    highlightDesc:
      'Žádný generický turistický balast. Soustředíme se výhradně na praktické detaily, které biker potřebuje vědět před odjezdem: zda v lokalitě jezdí lanovka, jaké jsou traily, kde si půjčit vybavení a na kolik vyjde ježdění.',
    cta: 'Prozkoumat bikeparky',
  },
  en: {
    title: 'About Euvida',
    subtitle: 'European bike parks and trail centers guide.',
    description:
      'Euvida.eu is dedicated to verified, practical information on European bike parks, trail networks, and mountain biking facilities. We help riders plan trail trips with confidence.',
    categoriesTitle: 'What will you find in our catalog?',
    categories: [
      {
        icon: '🚡',
        title: 'Lifts & Uplifts',
        desc: 'Details on chairlifts, gondolas, and uplift shuttles for hassle-free gravity riding.',
      },
      {
        icon: '🚵',
        title: 'Trails & Difficulty',
        desc: 'Trail profiles from smooth family flow trails to rugged downhill and enduro lines.',
      },
      {
        icon: '🔧',
        title: 'Rentals, Service & Facilities',
        desc: 'Availability of bike rentals, workshops, bike washes, and parking.',
      },
      {
        icon: '🗺️',
        title: 'Maps, Passes & Season',
        desc: 'Direct links to trail maps, operating calendars, pass prices, and rider essentials.',
      },
    ],
    highlightTitle: 'Why plan your trip with Euvida.eu?',
    highlightDesc:
      'No generic tourism clutter. We focus exclusively on practical riding intel: lift status, trail characteristics, rental options, and current passes.',
    cta: 'Explore bike parks',
  },
  de: {
    title: 'Über Euvida',
    subtitle: 'Katalog und Planer für europäische Bikeparks und Trailcenter.',
    description:
      'Euvida.eu bietet verifizierte, praxisnahe Informationen über europäische Bikeparks, Trail-Netzwerke und MTB-Infrastruktur.',
    categoriesTitle: 'Was finden Sie bei uns?',
    categories: [
      {
        icon: '🚡',
        title: 'Bergbahnen & Shuttles',
        desc: 'Informationen zu Sesselliften, Gondeln und Shuttles für den Biketransport.',
      },
      {
        icon: '🚵',
        title: 'Strecken & Schwierigkeit',
        desc: 'Streckenprofile von leichten Flowtrails bis zu anspruchsvollen Downhill- und Endurolinien.',
      },
      {
        icon: '🔧',
        title: 'Verleih, Service & Infrastruktur',
        desc: 'Verfügbarkeit von Bikeverleih, Werkstätten, Waschplätzen und Parkmöglichkeiten.',
      },
      {
        icon: '🗺️',
        title: 'Trailmaps & Tickets',
        desc: 'Direkte Links zu Trailkarten, Saisonzeiten, Ticketpreisen und praktischen Infos.',
      },
    ],
    highlightTitle: 'Warum mit Euvida.eu planen?',
    highlightDesc:
      'Kein allgemeiner Tourismus-Ballast. Wir konzentrieren uns auf das, was Biker wirklich vor Ort wissen müssen.',
    cta: 'Bikeparks entdecken',
  },
  fr: {
    title: 'À propos de Euvida',
    subtitle: 'Guide et catalogue des bike parks et trail centers en Europe.',
    description:
      'Euvida.eu rassemble des informations vérifiées et pratiques sur les bike parks européens, réseaux de sentiers et services VTT.',
    categoriesTitle: 'Que trouverez-vous dans notre catalogue ?',
    categories: [
      {
        icon: '🚡',
        title: 'Remontées & Shuttles',
        desc: 'Toutes les infos sur les télésièges, télécabines et navettes équipés pour les vélos.',
      },
      {
        icon: '🚵',
        title: 'Pistes & Niveaux',
        desc: 'Des pistes flow familiales aux descentes engagées et traces enduro techniques.',
      },
      {
        icon: '🔧',
        title: 'Location, Atelier & Services',
        desc: 'Où louer des VTT descente/enduro, trouver des stations de lavage et ateliers.',
      },
      {
        icon: '🗺️',
        title: 'Plans, Tarifs & Saison',
        desc: 'Accès direct aux plans de pistes, dates d\'ouverture et tarifs des forfaits.',
      },
    ],
    highlightTitle: 'Pourquoi préparer vos sorties avec Euvida.eu ?',
    highlightDesc:
      'Zéro contenu superflu. Tout ce qui compte pour rider en toute sérénité à travers l\'Europe.',
    cta: 'Découvrir les bike parks',
  },
  es: {
    title: 'Sobre Euvida',
    subtitle: 'Catálogo y guía de bike parks y trail centers en Europa.',
    description:
      'Euvida.eu ofrece información práctica y verificada sobre bike parks europeos, senderos y servicios para ciclistas de montaña.',
    categoriesTitle: '¿Qué encontrarás en nuestro catálogo?',
    categories: [
      {
        icon: '🚡',
        title: 'Remontes & Shuttles',
        desc: 'Detalles sobre telecabinas, telesillas y remontes para transportar tu bicicleta.',
      },
      {
        icon: '🚵',
        title: 'Pistas & Dificultad',
        desc: 'Desde senderos flow familiares hasta líneas técnicas de enduro y downhill.',
      },
      {
        icon: '🔧',
        title: 'Alquiler, Taller & Servicios',
        desc: 'Disponibilidad de alquiler de bicicletas, estaciones de lavado y talleres.',
      },
      {
        icon: '🗺️',
        title: 'Mapas, Pases & Temporada',
        desc: 'Enlaces a mapas de pistas, calendarios de apertura, precios y consejos útiles.',
      },
    ],
    highlightTitle: '¿Por qué planificar con Euvida.eu?',
    highlightDesc:
      'Sin relleno turístico genérico. Información precisa y enfocada exclusivamente en lo que importa al ciclista.',
    cta: 'Explorar bike parks',
  },
};

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { locale: rawLocale } = await params;
  const locale = (supportedLocales.includes(rawLocale as any) ? rawLocale : 'cs') as SupportedLocale;
  const t = contentByLocale[locale];

  return {
    metadataBase: new URL(siteUrl),
    title: `${t.title} | Euvida`,
    description: t.description,
    alternates: {
      canonical: `/${locale}/about`,
      languages: Object.fromEntries(
        supportedLocales.map((supportedLocale) => [
          supportedLocale,
          `/${supportedLocale}/about`,
        ])
      ),
    },
  };
}

export default async function AboutPage({ params }: PageProps) {
  const { locale: rawLocale } = await params;
  const locale = (supportedLocales.includes(rawLocale as any) ? rawLocale : 'cs') as keyof typeof contentByLocale;

  setRequestLocale(locale);

  const t = contentByLocale[locale];

  return (
    <main className="min-h-screen bg-slate-950 py-16 px-4 font-sans text-slate-100">
      <div className="max-w-4xl mx-auto space-y-16">
        {/* Header Section */}
        <header className="text-center space-y-4">
          <h1 className="text-4xl font-black md:text-6xl bg-gradient-to-r from-emerald-400 to-teal-300 bg-clip-text text-transparent">
            {t.title}
          </h1>
          <p className="text-xl font-bold text-white/90">{t.subtitle}</p>
          <div className="w-12 h-1 bg-emerald-500 mx-auto rounded-full mt-4" />
          <p className="text-slate-400 max-w-2xl mx-auto text-base md:text-lg leading-relaxed pt-2">
            {t.description}
          </p>
        </header>

        {/* Categories Grid */}
        <section className="space-y-8">
          <h2 className="text-2xl font-black text-center text-white md:text-3xl">
            {t.categoriesTitle}
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {t.categories.map((cat, idx) => (
              <div
                key={idx}
                className="p-6 rounded-3xl bg-slate-900/40 border border-white/10 hover:border-emerald-500/30 transition-all duration-300 hover:shadow-xl hover:shadow-emerald-500/[0.02]"
              >
                <div className="text-4xl mb-3">{cat.icon}</div>
                <h3 className="text-lg font-black text-white mb-2">{cat.title}</h3>
                <p className="text-sm text-slate-400 leading-relaxed">{cat.desc}</p>
              </div>
            ))}
          </div>
        </section>

        {/* Value Section */}
        <section className="p-8 rounded-3xl bg-slate-900 border border-white/10 shadow-xl space-y-4">
          <h2 className="text-xl font-black text-white flex items-center gap-2">
            💡 {t.highlightTitle}
          </h2>
          <p className="text-slate-300 text-sm leading-relaxed md:text-base">
            {t.highlightDesc}
          </p>
        </section>

        {/* Bottom CTA */}
        <footer className="text-center">
          <Link
            href={`/${locale}/articles`}
            className="inline-flex rounded-full bg-emerald-500 px-10 py-4 text-sm font-extrabold text-slate-950 hover:bg-emerald-400 transition-all hover:scale-105 shadow-lg shadow-emerald-500/20"
          >
            {t.cta} &rarr;
          </Link>
        </footer>
      </div>
    </main>
  );
}
