import type { WaterQualityStatus } from '@/lib/waterQuality';

type WaterQualityBoxProps = {
  status: WaterQualityStatus;
  locale: string;
};

const TEXT = {
  cs: {
    title: 'Kvalita vody',
    measured: 'Odběr',
    source: 'Zdroj',
    checked: 'Načteno',
    notice: 'Aktuální stav se může měnit. Před koupáním berte jako rozhodující údaje hygienické stanice.',
  },
  en: {
    title: 'Water Quality',
    measured: 'Sample date',
    source: 'Source',
    checked: 'Loaded',
    notice: 'Conditions can change. Before swimming, treat the public health authority data as decisive.',
  },
  de: {
    title: 'Wasserqualität',
    measured: 'Probe',
    source: 'Quelle',
    checked: 'Geladen',
    notice: 'Der Zustand kann sich ändern. Vor dem Baden sind die Angaben der Hygiene-Behörde maßgeblich.',
  },
  fr: {
    title: "Qualité de l'eau",
    measured: 'Prélèvement',
    source: 'Source',
    checked: 'Chargé',
    notice: "L'état peut changer. Avant la baignade, les données de l'autorité sanitaire font foi.",
  },
  es: {
    title: 'Calidad del agua',
    measured: 'Muestra',
    source: 'Fuente',
    checked: 'Cargado',
    notice: 'El estado puede cambiar. Antes del baño, prevalecen los datos de la autoridad sanitaria.',
  },
};

function getTone(level: number): { border: string; text: string; dot: string; star: string } {
  if (level === 1) {
    return {
      border: 'border-emerald-500/30',
      text: 'text-emerald-300',
      dot: 'bg-emerald-400',
      star: 'text-emerald-300 drop-shadow-[0_0_8px_rgba(52,211,153,0.55)]',
    };
  }

  if (level === 2) {
    return {
      border: 'border-lime-500/30',
      text: 'text-lime-300',
      dot: 'bg-lime-400',
      star: 'text-lime-300 drop-shadow-[0_0_8px_rgba(190,242,100,0.5)]',
    };
  }

  if (level === 3) {
    return {
      border: 'border-amber-500/30',
      text: 'text-amber-300',
      dot: 'bg-amber-400',
      star: 'text-amber-300 drop-shadow-[0_0_8px_rgba(252,211,77,0.5)]',
    };
  }

  if (level === 4) {
    return {
      border: 'border-orange-500/35',
      text: 'text-orange-300',
      dot: 'bg-orange-400',
      star: 'text-orange-300 drop-shadow-[0_0_8px_rgba(251,146,60,0.5)]',
    };
  }

  if (level >= 5) {
    return {
      border: 'border-red-500/35',
      text: 'text-red-300',
      dot: 'bg-red-400',
      star: 'text-red-300 drop-shadow-[0_0_8px_rgba(248,113,113,0.55)]',
    };
  }

  return {
    border: 'border-slate-500/30',
    text: 'text-slate-300',
    dot: 'bg-slate-400',
    star: 'text-slate-400',
  };
}

function getStarCount(level: number): number {
  if (level < 1 || level > 5) return 0;
  return 6 - level;
}

function WaterQualityStars({ level, label, tone }: { level: number; label: string; tone: ReturnType<typeof getTone> }) {
  const filledStars = getStarCount(level);

  return (
    <div
      className="inline-flex items-center gap-0.5 rounded-full border border-white/10 bg-white/5 px-2.5 py-1"
      aria-label={`${label}: ${filledStars} z 5`}
      title={`${label}: ${filledStars} z 5`}
    >
      {Array.from({ length: 5 }, (_, index) => {
        const isFilled = index < filledStars;
        return (
          <span
            key={index}
            className={`text-sm leading-none ${isFilled ? tone.star : 'text-slate-600/80'}`}
            aria-hidden="true"
          >
            ★
          </span>
        );
      })}
    </div>
  );
}

function formatLoadedAt(value: string, locale: string): string {
  const localeMap: Record<string, string> = {
    cs: 'cs-CZ',
    en: 'en-GB',
    de: 'de-DE',
    fr: 'fr-FR',
    es: 'es-ES',
  };

  return new Date(value).toLocaleString(localeMap[locale] ?? 'cs-CZ', {
    day: 'numeric',
    month: 'numeric',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export default function WaterQualityBox({ status, locale }: WaterQualityBoxProps) {
  const t = TEXT[locale as keyof typeof TEXT] ?? TEXT.cs;
  const tone = getTone(status.level);

  return (
    <section className={`rounded-2xl border ${tone.border} bg-slate-900/50 shadow-xl backdrop-blur overflow-hidden`}>
      <div className="px-5 py-4 border-b border-white/5 flex items-center justify-between bg-cyan-500/10 text-cyan-700 dark:text-cyan-300">
        <div className="flex items-center gap-3">
          <span className="text-xl">💧</span>
          <h2 className="text-lg font-extrabold tracking-tight">{t.title}</h2>
        </div>
        <WaterQualityStars level={status.level} label={status.label} tone={tone} />
      </div>

      <div className="px-5 py-5 space-y-4">
        <div className="flex items-start gap-3">
          <span className={`mt-1.5 h-3 w-3 rounded-full ${tone.dot}`} />
          <div>
            <div className={`text-sm font-black leading-snug ${tone.text}`}>{status.label}</div>
            {status.note && status.note !== status.label && (
              <p className="mt-1 text-sm leading-relaxed text-slate-400">{status.note}</p>
            )}
          </div>
        </div>

        <dl className="space-y-2 text-sm">
          <div className="flex justify-between gap-4">
            <dt className="font-bold text-white">{t.measured}</dt>
            <dd className="text-right text-slate-300">{status.date}</dd>
          </div>
          <div className="flex justify-between gap-4">
            <dt className="font-bold text-white">{t.checked}</dt>
            <dd className="text-right text-slate-300">{formatLoadedAt(status.checkedAt, locale)}</dd>
          </div>
          <div className="flex justify-between gap-4">
            <dt className="font-bold text-white">{t.source}</dt>
            <dd className="text-right">
              <a
                href={status.sourceUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="font-semibold text-cyan-700 underline break-all hover:text-cyan-800 dark:text-cyan-300 dark:hover:text-cyan-200"
              >
                {status.sourceHost}
              </a>
            </dd>
          </div>
        </dl>

        <p className="text-xs leading-relaxed text-slate-500">{t.notice}</p>
      </div>
    </section>
  );
}
