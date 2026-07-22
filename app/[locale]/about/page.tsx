import { supportedLocales } from '@/lib/articleTypes';
import { setRequestLocale } from 'next-intl/server';
import Link from 'next/link';

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
    subtitle: 'Váš ultimátní průvodce pro cestování po Evropě.',
    description: 'Euvida.eu se zaměřuje na poskytování autentických a praktických tipů na to, kam se v Evropě vydat a co od daných míst očekávat. Pomáháme vám objevovat nová místa a plánovat cesty bez chyb.',
    categoriesTitle: 'Co u nás najdete?',
    categories: [
      {
        icon: '🏖️',
        title: 'Příroda & Pláže',
        desc: 'Tipy na úchvatná jezera, čisté pláže a chráněné přírodní parky.',
      },
      {
        icon: '🏰',
        title: 'Hrady, zámky & památky',
        desc: 'Objevte fascinující historii a nejkrásnější architektonické skvosty.',
      },
      {
        icon: '🏙️',
        title: 'Městská turistika (City tripy)',
        desc: 'Průvodci evropskými metropolemi i malebnými skrytými městečky.',
      },
      {
        icon: '🏂',
        title: 'Aktivní dovolená',
        desc: 'Nejlepší bikeparky, lyžařská střediska, turistické trasy a tipy pro sportovce.',
      },
    ],
    highlightTitle: 'Proč sledovat Euvida.eu?',
    highlightDesc: 'Na rozdíl od běžných katalogů vám přinášíme reálné informace o počasí, průměrných teplotách v sezóně, cenách vstupů, dostupnosti služeb a reálné zkušenosti z míst. Chceme, abyste věděli přesně do čeho jdete, ještě než vyrazíte.',
    cta: 'Prozkoumat tipy na výlety',
  },
  en: {
    title: 'About Euvida',
    subtitle: 'Your ultimate travel guide to Europe.',
    description: 'Euvida.eu focuses on providing authentic and practical tips on where to go in Europe and what to expect. We help you discover new destinations and plan trips without mistakes.',
    categoriesTitle: 'What you can find here?',
    categories: [
      {
        icon: '🏖️',
        title: 'Nature & Beaches',
        desc: 'Tips for breathtaking lakes, clean beaches, and protected national parks.',
      },
      {
        icon: '🏰',
        title: 'Castles & Historic Sights',
        desc: 'Discover fascinating history and the most beautiful architectural gems.',
      },
      {
        icon: '🏙️',
        title: 'City Trips',
        desc: 'Guides to famous European metropolises and picturesque hidden towns.',
      },
      {
        icon: '🏂',
        title: 'Active Holidays',
        desc: 'Best bike parks, ski resorts, hiking trails, and tips for active travelers.',
      },
    ],
    highlightTitle: 'Why follow Euvida.eu?',
    highlightDesc: 'Unlike standard directories, we bring you real-time data about weather, seasonal average temperatures, entry prices, service availability, and authentic on-site experiences. We want you to know exactly what to expect before you set off.',
    cta: 'Explore trip tips',
  },
  de: {
    title: 'Über Euvida',
    subtitle: 'Ihr ultimativer Reiseführer für Europa.',
    description: 'Euvida.eu konzentriert sich darauf, authentische und praktische Tipps zu geben, wohin die Reise in Europa gehen soll und was Sie dort erwartet. Wir helfen Ihnen, neue Orte zu entdecken und Reisen fehlerfrei zu planen.',
    categoriesTitle: 'Was finden Sie bei uns?',
    categories: [
      {
        icon: '🏖️',
        title: 'Natur & Strände',
        desc: 'Tipps zu atemberaubenden Seen, sauberen Stränden und geschützten Naturparks.',
      },
      {
        icon: '🏰',
        title: 'Burgen, Schlösser & Denkmäler',
        desc: 'Entdecken Sie faszinierende Geschichte und die schönsten architektonischen Schätze.',
      },
      {
        icon: '🏙️',
        title: 'Städtetrips',
        desc: 'Führer durch europäische Metropolen und malerische, versteckte Kleinstädte.',
      },
      {
        icon: '🏂',
        title: 'Aktivurlaub',
        desc: 'Die besten Bikeparks, Skigebiete, Wanderwege und Tipps für Sportler.',
      },
    ],
    highlightTitle: 'Warum Euvida.eu folgen?',
    highlightDesc: 'Im Gegensatz zu Standardkatalogen bieten wir Ihnen echte Informationen über das Wetter, Durchschnittstemperaturen in der Saison, Eintrittspreise, Verfügbarkeit von Dienstleistungen und reale Erfahrungen vor Ort. Wir möchten, dass Sie genau wissen, worauf Sie sich einlassen, bevor Sie losfahren.',
    cta: 'Ausflugstipps entdecken',
  },
  fr: {
    title: 'À propos de Euvida',
    subtitle: 'Votre guide de voyage ultime pour l\'Europe.',
    description: 'Euvida.eu s\'attache à vous fournir des conseils authentiques et pratiques sur les destinations à visiter en Europe et ce qui vous y attend. Nous vous aidons à découvrir de nouveaux horizons et à planifier vos voyages sans stress.',
    categoriesTitle: 'Que trouverez-vous chez nous ?',
    categories: [
      {
        icon: '🏖️',
        title: 'Nature & Plages',
        desc: 'Conseils pour des lacs spectaculaires, des plages propres et des parcs naturels protégés.',
      },
      {
        icon: '🏰',
        title: 'Châteaux & Monuments historiques',
        desc: 'Découvrez une histoire passionnante et les plus beaux joyaux architecturaux.',
      },
      {
        icon: '🏙️',
        title: 'Escapades Urbaines',
        desc: 'Guides des métropoles européennes et des villes pittoresques cachées.',
      },
      {
        icon: '🏂',
        title: 'Vacances Actives',
        desc: 'Les meilleurs bike parks, stations de ski, sentiers de randonnée et conseils pour sportifs.',
      },
    ],
    highlightTitle: 'Pourquoi suivre Euvida.eu ?',
    highlightDesc: 'Contrairement aux annuaires classiques, nous vous apportons des informations réelles sur le climat, les températures saisonnières moyennes, les prix d\'entrée, la disponibilité des services et des retours d\'expérience vécus. Nous voulons que vous sachiez exactement à quoi vous attendre avant de partir.',
    cta: 'Découvrir les idées de sorties',
  },
  es: {
    title: 'Sobre Euvida',
    subtitle: 'Tu guía de viaje definitiva para Europa.',
    description: 'Euvida.eu se enfoca en proporcionar consejos auténticos y prácticos sobre dónde ir en Europa y qué esperar. Te ayudamos a descubrir nuevos destinos y a planificar tus viajes sin sorpresas.',
    categoriesTitle: '¿Qué puedes encontrar aquí?',
    categories: [
      {
        icon: '🏖️',
        title: 'Naturaleza y Playas',
        desc: 'Consejos para lagos impresionantes, playas limpias y parques naturales protegidos.',
      },
      {
        icon: '🏰',
        title: 'Castillos y Monumentos',
        desc: 'Descubre una historia fascinante y las joyas arquitectónicas más bellas.',
      },
      {
        icon: '🏙️',
        title: 'Viajes Urbanos',
        desc: 'Guías de famosas metrópolis europeas y pintorescos pueblos escondidos.',
      },
      {
        icon: '🏂',
        title: 'Vacaciones Activas',
        desc: 'Los mejores bike parks, estaciones de esquí, senderos y consejos para deportistas.',
      },
    ],
    highlightTitle: '¿Por qué seguir a Euvida.eu?',
    highlightDesc: 'A diferencia de los directorios habituales, te ofrecemos información real sobre el clima, temperaturas medias de temporada, precios de entrada, disponibilidad de servicios y experiencias reales en el lugar. Queremos que sepas exactamente qué esperar antes de emprender tu viaje.',
    cta: 'Explorar ideas de viajes',
  },
};

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
          <p className="text-xl font-bold text-white/90">
            {t.subtitle}
          </p>
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
            href={`/${locale}`} 
            className="inline-flex rounded-full bg-emerald-500 px-10 py-4 text-sm font-extrabold text-slate-950 hover:bg-emerald-400 transition-all hover:scale-105 shadow-lg shadow-emerald-500/20"
          >
            {t.cta} &rarr;
          </Link>
        </footer>

      </div>
    </main>
  );
}
