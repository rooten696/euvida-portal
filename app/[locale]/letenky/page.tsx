import React from 'react';
import type { Metadata } from 'next';
import Link from 'next/link';
import { setRequestLocale } from 'next-intl/server';
import { supportedLocales } from '@/lib/articleTypes';
import { normalizeLocale } from '@/lib/articleLocalization';
import { canonicalMetadataBase, getCanonicalUrl } from '@/lib/siteConfig';
import KiwiFlightWidget from '@/app/components/flights/KiwiFlightWidget';

export const revalidate = 86400;

export async function generateStaticParams() {
  return supportedLocales.map((locale) => ({ locale }));
}

type FlightsPageProps = {
  params: Promise<{ locale: string }>;
};

const flightPageContent = {
  cs: {
    metaTitle: 'Levné letenky po Evropě i do světa | Euvida',
    metaDescription:
      'Vyhledejte a porovnejte nejlevnější letenky s Kiwi.com na Euvidě. Automatické určení nejbližšího letiště, virtuální propojování aerolinek a garance přestupů.',
    badge: 'Vyhledávač letenek • Kiwi.com',
    title: 'Levné letenky po Evropě i do světa',
    subtitle:
      'Chytré vyhledávání letenek s virtuálním propojováním aerolinek. Systém automaticky vyhledá odlety z vašeho nejbližšího letiště s garancí nejlepších cen.',
    breadcrumbHome: 'Domů',
    breadcrumbFlights: 'Letenky',
    widgetAriaLabel: 'Vyhledávač letenek Kiwi.com',
    features: [
      {
        icon: '📍',
        title: 'Nejbližší letiště automaticky',
        desc: 'Vyhledávač sám rozpozná vaši lokalitu a předvybere nejvhodnější odletové letiště (Praha, Vídeň, Brno, Katovice atd.).',
      },
      {
        icon: '🔀',
        title: 'Virtuální propojování linek',
        desc: 'Kiwi.com unikátně kombinuje aerolinky, které spolu běžně nespolupracují, a najde tak trasy a ceny, které jinde neexistují.',
      },
      {
        icon: '🛡️',
        title: 'Garance Kiwi.com',
        desc: 'Kompletní ochrana při zpoždění nebo zrušení navazujících letů. V případě komplikací máte nárok na náhradní spoj nebo refundaci.',
      },
    ],
    tipsHeading: 'Jak najít nejvýhodnější letenky?',
    tips: [
      {
        title: 'Buďte flexibilní s termínem',
        desc: 'Lety v úterý, středu nebo v brzkých ranních hodinách bývají výrazně levnější než páteční a nedělní špičky.',
      },
      {
        title: 'Zvažte alternativní letiště v okolí',
        desc: 'Pokud letíte z ČR, porovnejte kromě Prahy také Vídeň (VIE), Katovice (KTW), Vratislav (WRO) nebo Drážďany (DRS).',
      },
      {
        title: 'Cestujte pouze s příručním zavazadlem',
        desc: 'Nízkonákladové aerolinky si za odbavená zavazadla účtují vysoké poplatky. Na víkendové výlety a eurovíkendy vám batoh do 40×30×20 cm bohatě postačí.',
      },
      {
        title: 'Kombinujte různé společnosti pro cestu tam a zpět',
        desc: 'Díky Kiwi.com můžete letět tam např. s Ryanairem a zpět s Wizz Airem nebo easyJetem bez nutnosti kupovat dvě separátní letenky zvlášť.',
      },
    ],
    destinationsHeading: 'Oblíbené evropské destinace z ČR a okolí',
    destinations: [
      { name: 'Londýn', code: 'LON', desc: 'Metropole kultury, muzeí zdarma a ikonických památek.' },
      { name: 'Řím', code: 'ROM', desc: 'Věčné město s historií na každém kroku a špičkovou gastronomií.' },
      { name: 'Barcelona', code: 'BCN', desc: 'Kombinace pláží, Gaudího architektury a katalánského tapas.' },
      { name: 'Málaga & Andalusie', code: 'AGP', desc: 'Sluncem zalité pobřeží Costa del Sol i historická bílá městečka.' },
      { name: 'Milán', code: 'MIL', desc: 'Centrum módy a skvělá brána k jezerům Como a Garda.' },
      { name: 'Mallorca', code: 'PMI', desc: 'Azurové zátoky, hory Serra de Tramuntana a pohodové pláže.' },
    ],
    ctaTitle: 'Hledáte inspiraci, kam vyrazit?',
    ctaDesc: 'Prozkoumejte naše podrobné průvodce po evropských zemích, regionech a městech.',
    ctaButton: 'Prozkoumat evropské destinace →',
  },
  en: {
    metaTitle: 'Cheap Flights across Europe & Worldwide | Euvida',
    metaDescription:
      'Search and compare the cheapest flights with Kiwi.com on Euvida. Automatic nearest airport detection, virtual interlining, and transfer guarantee.',
    badge: 'Flight Search • Kiwi.com',
    title: 'Cheap Flights across Europe & Worldwide',
    subtitle:
      'Smart flight search engine with virtual interlining. Automatically detects your nearest departure airport with unbeatable route combinations.',
    breadcrumbHome: 'Home',
    breadcrumbFlights: 'Flights',
    widgetAriaLabel: 'Kiwi.com Flight Search',
    features: [
      {
        icon: '📍',
        title: 'Nearest Airport Detection',
        desc: 'The search widget automatically identifies your location and pre-selects the most convenient departure airport.',
      },
      {
        icon: '🔀',
        title: 'Virtual Interlining',
        desc: 'Kiwi.com combines flights from non-partner airlines to create unique routes and lowest possible fares.',
      },
      {
        icon: '🛡️',
        title: 'Kiwi.com Guarantee',
        desc: 'Protection against flight delays, cancellations, and schedule changes with alternative flights or instant refunds.',
      },
    ],
    tipsHeading: 'How to Find the Cheapest Flights',
    tips: [
      {
        title: 'Be Flexible with Travel Dates',
        desc: 'Midweek flights (Tuesdays and Wednesdays) are typically cheaper than Friday and Sunday peaks.',
      },
      {
        title: 'Check Nearby Airports',
        desc: 'Broaden your search to secondary nearby airports to uncover hidden low-cost carrier deals.',
      },
      {
        title: 'Travel Light with Carry-on Bags',
        desc: 'Avoid checked luggage fees by packing smartly in cabin-sized luggage for weekend getaways.',
      },
      {
        title: 'Mix and Match Airlines',
        desc: 'Fly out with one airline and return with another to save money and get better departure times.',
      },
    ],
    destinationsHeading: 'Popular European Flight Destinations',
    destinations: [
      { name: 'London', code: 'LON', desc: 'World-class culture, free national museums, and iconic landmarks.' },
      { name: 'Rome', code: 'ROM', desc: 'The Eternal City with thousands of years of living history.' },
      { name: 'Barcelona', code: 'BCN', desc: 'Mediterranean beaches, Gaudí masterpieces, and lively tapas bars.' },
      { name: 'Málaga', code: 'AGP', desc: 'Sun-drenched Costa del Sol coastline and charming Andalusian towns.' },
      { name: 'Milan', code: 'MIL', desc: 'Fashion capital and gateway to Lakes Como and Maggiore.' },
      { name: 'Mallorca', code: 'PMI', desc: 'Crystal-clear calas, scenic mountain roads, and warm sunshine.' },
    ],
    ctaTitle: 'Need inspiration on where to go next?',
    ctaDesc: 'Browse our detailed travel guides to European countries, regions, and cities.',
    ctaButton: 'Explore European Destinations →',
  },
  de: {
    metaTitle: 'Günstige Flüge in Europa & weltweit | Euvida',
    metaDescription:
      'Suchen und vergleichen Sie günstige Flüge mit Kiwi.com auf Euvida. Automatische Flughafen-Erkennung, Virtual Interlining und Umsteigegarantie.',
    badge: 'Flugsuche • Kiwi.com',
    title: 'Günstige Flüge in Europa & weltweit',
    subtitle:
      'Intelligente Flugsuchmaschine mit Virtual Interlining. Erkennt automatisch Ihren nächstgelegenen Abflughafen.',
    breadcrumbHome: 'Startseite',
    breadcrumbFlights: 'Flüge',
    widgetAriaLabel: 'Kiwi.com Flugsuche',
    features: [
      {
        icon: '📍',
        title: 'Automatische Abflughafenerkennung',
        desc: 'Die Suchmaske ermittelt Ihren Standort und wählt den günstigsten Abflughafen in Ihrer Nähe aus.',
      },
      {
        icon: '🔀',
        title: 'Virtual Interlining',
        desc: 'Kiwi.com kombiniert Flüge verschiedener Fluggesellschaften für unschlagbare Preise und einzigartige Routen.',
      },
      {
        icon: '🛡️',
        title: 'Kiwi.com Garantie',
        desc: 'Umfassender Schutz bei Flugausfällen und Verspätungen inklusive Ersatzflug oder Erstattung.',
      },
    ],
    tipsHeading: 'Tipps für die günstigsten Flugtickets',
    tips: [
      {
        title: 'Flexibel bei den Reisetagen bleiben',
        desc: 'Flüge unter der Woche (Dienstag und Mittwoch) sind in der Regel deutlich günstiger als am Wochenende.',
      },
      {
        title: 'Flughäfen in der Umgebung vergleichen',
        desc: 'Prüfen Sie alternative Airports in Ihrer Region für mehr Low-Cost-Optionen.',
      },
      {
        title: 'Nur mit Handgepäck reisen',
        desc: 'Sparen Sie Zusatzgebühren für aufgegebenes Gepäck bei Kurzreisen und Städtetrips.',
      },
      {
        title: 'Verschiedene Airlines kombinieren',
        desc: 'Hinflug und Rückflug mit unterschiedlichen Anbietern buchen für maximale Ersparnis.',
      },
    ],
    destinationsHeading: 'Beliebte europäische Flugziele',
    destinations: [
      { name: 'London', code: 'LON', desc: 'Weltbekannte Museen, Musical-Highlights und multikulturelle Vielfalt.' },
      { name: 'Rom', code: 'ROM', desc: 'Die Ewige Stadt voller antiker Monumente und kulinarischer Schätze.' },
      { name: 'Barcelona', code: 'BCN', desc: 'Kombination aus Mittelmeerstrand und faszinierender Gaudí-Kunst.' },
      { name: 'Málaga', code: 'AGP', desc: 'Andalusischer Charme und sonnige Tage an der Costa del Sol.' },
      { name: 'Mailand', code: 'MIL', desc: 'Modemetropole und idealer Ausgangspunkt für die oberitalienischen Seen.' },
      { name: 'Mallorca', code: 'PMI', desc: 'Traumhafte Buchten und landschaftliche Vielfalt auf den Balearen.' },
    ],
    ctaTitle: 'Suchen Sie Inspiration für Ihre nächste Reise?',
    ctaDesc: 'Entdecken Sie unsere umfassenden Reiseführer für europäische Länder und Regionen.',
    ctaButton: 'Reiseziele entdecken →',
  },
  fr: {
    metaTitle: 'Vols pas chers en Europe et dans le monde | Euvida',
    metaDescription:
      'Recherchez et comparez les vols les moins chers avec Kiwi.com sur Euvida. Détection automatique de l’aéroport le plus proche et correspondance garantie.',
    badge: 'Comparateur de vols • Kiwi.com',
    title: 'Vols pas chers en Europe et dans le monde',
    subtitle:
      'Moteur de recherche intelligent avec combinaison virtuelle de vols. Détection automatique de votre aéroport de départ le plus proche.',
    breadcrumbHome: 'Accueil',
    breadcrumbFlights: 'Vols',
    widgetAriaLabel: 'Comparateur de vols Kiwi.com',
    features: [
      {
        icon: '📍',
        title: 'Détection de l’aéroport le plus proche',
        desc: 'Le système identifie automatiquement votre position géographique pour pré-sélectionner l’aéroport le plus pratique.',
      },
      {
        icon: '🔀',
        title: 'Combinaison virtuelle (Virtual Interlining)',
        desc: 'Kiwi.com associe des compagnies aériennes qui ne collaborent pas habituellement pour créer des tarifs imbattables.',
      },
      {
        icon: '🛡️',
        title: 'Garantie Kiwi.com',
        desc: 'Assistance complète en cas de retard ou d’annulation avec réacheminement ou remboursement.',
      },
    ],
    tipsHeading: 'Comment dénicher les billets d’avion les moins chers ?',
    tips: [
      {
        title: 'Soyez flexible sur les dates',
        desc: 'Les vols en milieu de semaine (mardi et mercredi) sont généralement plus avantageux que les départs le week-end.',
      },
      {
        title: 'Explorez les aéroports voisins',
        desc: 'Vérifiez les aéroports alternatifs à proximité pour profiter des meilleures offres des compagnies low-cost.',
      },
      {
        title: 'Voyagez léger avec un bagage cabine',
        desc: 'Évitez les frais supplémentaires d’enregistrement de bagages pour vos séjours de courte durée.',
      },
      {
        title: 'Croisez les compagnies aller et retour',
        desc: 'Partez avec une compagnie et revenez avec une autre pour optimiser vos horaires et votre budget.',
      },
    ],
    destinationsHeading: 'Destinations européennes les plus populaires',
    destinations: [
      { name: 'Londres', code: 'LON', desc: 'Monuments célèbres, musées gratuits et ambiance cosmopolite.' },
      { name: 'Rome', code: 'ROM', desc: 'Histoire millénaire, ruelles pittoresques et gastronomie italienne réputée.' },
      { name: 'Barcelone', code: 'BCN', desc: 'Bord de mer méditerranéen et chefs-d’œuvre d’Antoni Gaudí.' },
      { name: 'Málaga', code: 'AGP', desc: 'La douceur de vivre andalouse et les plages de la Costa del Sol.' },
      { name: 'Milan', code: 'MIL', desc: 'Capitale du design et point d’accès direct aux grands lacs italiens.' },
      { name: 'Majorque', code: 'PMI', desc: 'Criques sauvages aux eaux turquoise et villages authentiques.' },
    ],
    ctaTitle: 'Besoin d’inspiration pour vos prochaines vacances ?',
    ctaDesc: 'Parcourez nos guides pratiques sur les pays, régions et trésors d’Europe.',
    ctaButton: 'Découvrir les destinations d’Europe →',
  },
  es: {
    metaTitle: 'Vuelos baratos por Europa y el mundo | Euvida',
    metaDescription:
      'Busca y compara los vuelos más baratos con Kiwi.com en Euvida. Detección automática del aeropuerto más cercano y garantía de conexión.',
    badge: 'Buscador de vuelos • Kiwi.com',
    title: 'Vuelos baratos por Europa y el mundo',
    subtitle:
      'Buscador inteligente con conexión virtual de aerolíneas. Detecta de forma automática tu aeropuerto más cercano con los precios más competitivos.',
    breadcrumbHome: 'Inicio',
    breadcrumbFlights: 'Vuelos',
    widgetAriaLabel: 'Buscador de vuelos Kiwi.com',
    features: [
      {
        icon: '📍',
        title: 'Detección automática del aeropuerto',
        desc: 'El buscador reconoce tu ubicación geográfica y preselecciona el aeropuerto de salida más conveniente para ti.',
      },
      {
        icon: '🔀',
        title: 'Conexión virtual de aerolíneas',
        desc: 'Kiwi.com combina vuelos de aerolíneas que no tienen acuerdos entre sí para ofrecer rutas únicas y tarifas más bajas.',
      },
      {
        icon: '🛡️',
        title: 'Garantía Kiwi.com',
        desc: 'Protección integral ante retrasos y cancelaciones con vuelos alternativos o reembolso inmediato.',
      },
    ],
    tipsHeading: 'Consejos para conseguir vuelos al mejor precio',
    tips: [
      {
        title: 'Sé flexible en las fechas',
        desc: 'Los vuelos de martes y miércoles suelen ser más económicos que los del fin de semana.',
      },
      {
        title: 'Compara aeropuertos cercanos',
        desc: 'Considera aeropuertos secundarios en tu radio de viaje para acceder a tarifas low cost.',
      },
      {
        title: 'Viaja ligero con equipaje de mano',
        desc: 'Ahorra en suplementos facturando solo lo necesario para escapadas urbanas y escapadas cortas.',
      },
      {
        title: 'Combina aerolíneas para ida y vuelta',
        desc: 'Vuela con una compañía a la ida y otra a la vuelta para conseguir los mejores horarios al menor coste.',
      },
    ],
    destinationsHeading: 'Destinos europeos más demandados',
    destinations: [
      { name: 'Londres', code: 'LON', desc: 'Museos de referencia mundial y gran ambiente cosmopolita.' },
      { name: 'Roma', code: 'ROM', desc: 'Historia en cada rincón, monumentos clásicos y deliciosa gastronomía.' },
      { name: 'Barcelona', code: 'BCN', desc: 'Playa mediterránea, arte modernista de Gaudí y animada vida urbana.' },
      { name: 'Málaga', code: 'AGP', desc: 'El encanto andaluz, luz durante todo el año y la Costa del Sol.' },
      { name: 'Milán', code: 'MIL', desc: 'Centro de la moda y puerta de entrada a los lagos del norte de Italia.' },
      { name: 'Mallorca', code: 'PMI', desc: 'Calas de aguas cristalinas y pueblos con encanto en las Islas Baleares.' },
    ],
    ctaTitle: '¿Buscas inspiración para tu próximo viaje?',
    ctaDesc: 'Explora nuestras guías completas sobre países, regiones y ciudades europeas.',
    ctaButton: 'Explorar destinos europeos →',
  },
};

export async function generateMetadata({ params }: FlightsPageProps): Promise<Metadata> {
  const { locale: rawLocale } = await params;
  const locale = normalizeLocale(rawLocale);
  const t = flightPageContent[locale] || flightPageContent.cs;

  return {
    metadataBase: canonicalMetadataBase,
    title: t.metaTitle,
    description: t.metaDescription,
    alternates: {
      canonical: `/${locale}/letenky`,
      languages: {
        ...Object.fromEntries(
          supportedLocales.map((loc) => [loc, `/${loc}/letenky`])
        ),
        'x-default': '/cs/letenky',
      },
    },
    openGraph: {
      title: t.metaTitle,
      description: t.metaDescription,
      url: getCanonicalUrl(`/${locale}/letenky`),
      siteName: 'EUVIDA.eu',
      locale,
      type: 'website',
    },
    twitter: {
      card: 'summary_large_image',
      title: t.metaTitle,
      description: t.metaDescription,
    },
  };
}

export default async function FlightsPage({ params }: FlightsPageProps) {
  const { locale: rawLocale } = await params;
  const locale = normalizeLocale(rawLocale);
  setRequestLocale(locale);

  const t = flightPageContent[locale] || flightPageContent.cs;

  const breadcrumbsStructuredData = {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: [
      {
        '@type': 'ListItem',
        position: 1,
        name: t.breadcrumbHome,
        item: getCanonicalUrl(`/${locale}`),
      },
      {
        '@type': 'ListItem',
        position: 2,
        name: t.breadcrumbFlights,
        item: getCanonicalUrl(`/${locale}/letenky`),
      },
    ],
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbsStructuredData) }}
      />

      <main className="min-h-screen bg-slate-950 px-4 py-10 font-sans text-slate-100 sm:py-16">
        <div className="mx-auto max-w-6xl space-y-12 sm:space-y-16">
          {/* Breadcrumb Navigation */}
          <nav aria-label="Breadcrumb" className="flex items-center gap-2 text-xs text-slate-400 sm:text-sm">
            <Link href={`/${locale}`} className="hover:text-emerald-400 transition-colors">
              {t.breadcrumbHome}
            </Link>
            <span>/</span>
            <span className="font-semibold text-emerald-400">{t.breadcrumbFlights}</span>
          </nav>

          {/* Header Hero Section */}
          <header className="space-y-4 text-center">
            <div className="inline-flex items-center gap-2 rounded-full border border-emerald-500/30 bg-emerald-500/10 px-4 py-1.5 text-xs font-bold text-emerald-400">
              <span>✈️</span>
              <span>{t.badge}</span>
            </div>
            <h1 className="bg-gradient-to-r from-emerald-400 via-teal-300 to-cyan-400 bg-clip-text text-3xl font-black tracking-tight text-transparent sm:text-5xl md:text-6xl">
              {t.title}
            </h1>
            <p className="mx-auto max-w-3xl text-sm leading-relaxed text-slate-300 sm:text-base md:text-lg">
              {t.subtitle}
            </p>
          </header>

          {/* Value Props / Highlights Grid */}
          <section className="grid grid-cols-1 gap-4 sm:grid-cols-3 sm:gap-6">
            {t.features.map((feature, idx) => (
              <div
                key={idx}
                className="rounded-3xl border border-white/10 bg-slate-900/50 p-6 backdrop-blur-md transition-all hover:border-emerald-500/30 hover:shadow-xl hover:shadow-emerald-500/[0.02]"
              >
                <div className="mb-3 text-3xl">{feature.icon}</div>
                <h2 className="mb-2 text-base font-black text-white sm:text-lg">
                  {feature.title}
                </h2>
                <p className="text-xs leading-relaxed text-slate-400 sm:text-sm">
                  {feature.desc}
                </p>
              </div>
            ))}
          </section>

          {/* Travelpayouts / Kiwi Widget Section */}
          <section aria-label={t.widgetAriaLabel}>
            <KiwiFlightWidget locale={locale} />
          </section>

          {/* Popular Flight Destinations */}
          <section className="space-y-6">
            <h2 className="text-center text-xl font-black text-white sm:text-2xl md:text-3xl">
              🌍 {t.destinationsHeading}
            </h2>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 md:grid-cols-3">
              {t.destinations.map((dest, idx) => (
                <div
                  key={idx}
                  className="rounded-2xl border border-white/10 bg-slate-900/40 p-5 transition-all hover:border-emerald-500/40"
                >
                  <div className="flex items-center justify-between mb-2">
                    <h3 className="text-base font-extrabold text-white">{dest.name}</h3>
                    <span className="rounded-md bg-white/5 px-2 py-0.5 text-xs font-mono font-bold text-emerald-400">
                      {dest.code}
                    </span>
                  </div>
                  <p className="text-xs text-slate-400 leading-relaxed">{dest.desc}</p>
                </div>
              ))}
            </div>
          </section>

          {/* Travel Tips FAQ Section */}
          <section className="space-y-6 rounded-3xl border border-white/10 bg-slate-900/40 p-6 sm:p-10">
            <h2 className="text-xl font-black text-white sm:text-2xl">
              💡 {t.tipsHeading}
            </h2>
            <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
              {t.tips.map((tip, idx) => (
                <div key={idx} className="space-y-2">
                  <h3 className="text-sm font-bold text-emerald-400 sm:text-base">
                    {tip.title}
                  </h3>
                  <p className="text-xs leading-relaxed text-slate-300 sm:text-sm">
                    {tip.desc}
                  </p>
                </div>
              ))}
            </div>
          </section>

          {/* Bottom Call to Action */}
          <section aria-label={t.ctaTitle} className="text-center space-y-4 pt-4">
            <h3 className="text-lg font-bold text-white sm:text-xl">{t.ctaTitle}</h3>
            <p className="text-xs text-slate-400 sm:text-sm max-w-xl mx-auto">{t.ctaDesc}</p>
            <div className="pt-2">
              <Link
                href={`/${locale}`}
                className="inline-flex rounded-full bg-emerald-500 px-8 py-3.5 text-sm font-extrabold text-slate-950 shadow-lg shadow-emerald-500/20 transition-all hover:scale-105 hover:bg-emerald-400"
              >
                {t.ctaButton}
              </Link>
            </div>
          </section>
        </div>
      </main>
    </>
  );
}
