import { getArticleLabel } from '@/lib/articleLabels';
import type { ImageCredit as ImageCreditType } from '@/lib/articleTypes';

type ImageCreditProps = {
  locale: string;
  credit?: ImageCreditType | null;
};

function CreditPart({ label, url }: { label: string; url?: string | null }) {
  if (!url) {
    return <span>{label}</span>;
  }

  return (
    <a
      href={url}
      target="_blank"
      rel="noopener noreferrer"
      className="font-medium text-blue-800 underline decoration-blue-200 underline-offset-2 transition-colors hover:text-blue-950"
    >
      {label}
    </a>
  );
}

export default function ImageCredit({ locale, credit }: ImageCreditProps) {
  if (!credit) {
    return null;
  }

  const sourceLabel = credit.source_name ?? credit.source ?? credit.source_url ?? null;
  const parts: { label: string; url?: string | null }[] = [];

  if (credit.attribution_text) {
    parts.push({ label: credit.attribution_text, url: credit.source_url });
  } else if (credit.author_name) {
    parts.push({ label: credit.author_name, url: credit.author_url });
  }

  if (credit.license_name) {
    parts.push({ label: credit.license_name, url: credit.license_url });
  }

  if (sourceLabel && sourceLabel !== credit.attribution_text) {
    parts.push({ label: sourceLabel, url: credit.source_url });
  }

  if (parts.length === 0) {
    return null;
  }

  return (
    <figcaption className="mt-2 text-xs leading-relaxed text-slate-500">
      <span className="font-semibold text-slate-700">{getArticleLabel(locale, 'photo')}:</span>{' '}
      {parts.map((part, index) => (
        <span key={`${part.label}-${index}`}>
          {index > 0 && ', '}
          <CreditPart label={part.label} url={part.url} />
        </span>
      ))}
    </figcaption>
  );
}
