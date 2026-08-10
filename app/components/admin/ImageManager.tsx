'use client';

import type { ImageCredit, SupportedLocale } from '@/lib/articleTypes';
import { useId, useState } from 'react';

const imageBucket = process.env.NEXT_PUBLIC_SUPABASE_IMAGE_BUCKET ?? 'article-images';
const altLocales: SupportedLocale[] = ['cs', 'en', 'de', 'fr', 'es'];

type ImageManagerProps = {
  title: string;
  entityType: string;
  articleId?: string | null;
  entityId?: string | null;
  imageUrl?: string | null;
  disabled?: boolean;
  compact?: boolean;
  altValues?: Partial<Record<SupportedLocale, string>>;
  credit?: ImageCredit | null;
  onImageUrlChange: (value: string) => void;
  onAltChange?: (locale: SupportedLocale, value: string) => void;
  onCreditChange?: (credit: ImageCredit) => void;
  onStatus?: (message: string) => void;
};

function hasImageCredit(credit: ImageCredit | null | undefined): boolean {
  if (!credit) {
    return false;
  }

  return Object.values(credit).some((value) => typeof value === 'string' && value.trim());
}

function creditSummary(credit: ImageCredit | null | undefined): string {
  if (!credit) {
    return 'Bez zdroje/licence';
  }

  return (
    credit.source_url ||
    credit.source_name ||
    credit.source ||
    credit.attribution_text ||
    credit.license_name ||
    'Bez zdroje/licence'
  );
}

export default function ImageManager({
  title,
  entityType,
  articleId,
  entityId,
  imageUrl,
  disabled = false,
  compact = false,
  altValues,
  credit,
  onImageUrlChange,
  onAltChange,
  onCreditChange,
  onStatus,
}: ImageManagerProps) {
  const id = useId();
  const [uploading, setUploading] = useState(false);
  const [importing, setImporting] = useState(false);
  const [creditOpen, setCreditOpen] = useState(false);
  const [localMessage, setLocalMessage] = useState('');
  const canEditCredit = Boolean(onCreditChange);
  const canEditAlt = Boolean(onAltChange);

  const updateCredit = (field: keyof ImageCredit, value: string) => {
    onCreditChange?.({
      ...(credit ?? {}),
      [field]: value,
    });
  };

  const handleUpload = async (file: File | null) => {
    if (!file) {
      return;
    }

    setUploading(true);
    setLocalMessage('Nahrávám obrázek...');
    onStatus?.('Nahrávám obrázek...');

    try {
      const { supabase } = await import('@/lib/supabaseBrowserClient');
      const { data } = await supabase.auth.getSession();
      const accessToken = data.session?.access_token;

      if (!accessToken) {
        throw new Error('Nejsi přihlášený.');
      }

      const formData = new FormData();
      formData.append('file', file);
      formData.append('entityType', entityType);
      formData.append('entityId', entityId || 'new');
      if (articleId) {
        formData.append('articleId', articleId);
      }

      const response = await fetch('/api/admin/upload-image', {
        method: 'POST',
        headers: {
          authorization: `Bearer ${accessToken}`,
        },
        body: formData,
      });
      const payload = (await response.json().catch(() => null)) as
        | { ok?: boolean; publicUrl?: string; error?: string }
        | null;

      if (!response.ok || !payload?.ok || !payload.publicUrl) {
        throw new Error(payload?.error ?? `HTTP ${response.status}`);
      }

      onImageUrlChange(payload.publicUrl);
      const message = articleId
        ? 'Obrázek nahrán a nastaven u článku.'
        : 'Obrázek nahrán. Nezapomeň uložit formulář.';
      setLocalMessage(message);
      onStatus?.(message);
    } catch (error) {
      const message = `Chyba uploadu: ${
        error instanceof Error ? error.message : 'neznámá chyba'
      }`;
      setLocalMessage(message);
      onStatus?.(message);
    } finally {
      setUploading(false);
    }
  };

  const handleImportUrl = async () => {
    const sourceUrl = imageUrl?.trim();

    if (!sourceUrl) {
      setLocalMessage('Nejdřív vlož URL obrázku nebo stránky s náhledovým obrázkem.');
      return;
    }

    const { supabase } = await import('@/lib/supabaseBrowserClient');
    const { data } = await supabase.auth.getSession();
    const accessToken = data.session?.access_token;

    if (!accessToken) {
      setLocalMessage('Nejsi přihlášený.');
      onStatus?.('Nejsi přihlášený.');
      return;
    }

    setImporting(true);
    setLocalMessage('Přebírám obrázek do úložiště...');
    onStatus?.('Přebírám obrázek do úložiště...');

    try {
      const response = await fetch('/api/admin/import-image', {
        method: 'POST',
        headers: {
          authorization: `Bearer ${accessToken}`,
          'content-type': 'application/json',
        },
        body: JSON.stringify({
          imageUrl: sourceUrl,
          entityType,
          entityId,
          articleId,
        }),
      });
      const payload = (await response.json().catch(() => null)) as
        | { ok?: boolean; publicUrl?: string; error?: string }
        | null;

      if (!response.ok || !payload?.ok || !payload.publicUrl) {
        throw new Error(payload?.error ?? `HTTP ${response.status}`);
      }

      onImageUrlChange(payload.publicUrl);
      const message = articleId
        ? 'Obrázek je převzatý do úložiště a nastavený u článku.'
        : 'Obrázek je převzatý do úložiště. Nezapomeň uložit formulář.';
      setLocalMessage(message);
      onStatus?.(message);
    } catch (error) {
      const message = `Převzetí se nepodařilo: ${
        error instanceof Error ? error.message : 'neznámá chyba'
      }`;
      setLocalMessage(message);
      onStatus?.(message);
    } finally {
      setImporting(false);
    }
  };

  return (
    <section className="max-w-full overflow-hidden rounded-2xl border border-white/10 bg-slate-950/40 p-3 sm:p-4">
      {!compact && (
        <div className="mb-4 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div>
            <h3 className="text-sm font-black uppercase tracking-wide text-blue-300">
              {title}
            </h3>
            <p className="mt-1 text-xs font-medium text-slate-400">
              Externí URL nebo upload do Supabase Storage bucketu `{imageBucket}`.
            </p>
          </div>
        {imageUrl && (
          <button
            type="button"
            disabled={disabled}
            onClick={() => onImageUrlChange('')}
            className="rounded-full bg-rose-500/10 px-3 py-1.5 text-xs font-bold text-rose-300 ring-1 ring-rose-500/20 hover:bg-rose-500/20 disabled:cursor-not-allowed disabled:opacity-50"
          >
            Odebrat obrázek
          </button>
        )}
        </div>
      )}

      <div className={`grid min-w-0 gap-4 ${compact ? 'lg:grid-cols-[190px_minmax(0,1fr)]' : 'lg:grid-cols-[220px_minmax(0,1fr)]'}`}>
        <div className={`relative flex w-full items-center justify-center overflow-hidden rounded-xl border border-white/10 bg-slate-900 shadow-inner ${compact ? 'h-48 sm:h-56 lg:h-32' : 'h-52 sm:h-60 lg:h-36'}`}>
          {imageUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={imageUrl}
              alt=""
              className="h-full w-full object-contain"
            />
          ) : (
            <div className="flex h-full w-full items-center justify-center bg-slate-950 px-4 text-center">
              <span className="rounded-full bg-white/10 px-3 py-1 text-xs font-black uppercase tracking-wide text-slate-300 ring-1 ring-white/10">
                Bez obrázku
              </span>
            </div>
          )}
        </div>

        <div className="min-w-0 space-y-4">
          <label className="block">
            <span className="text-xs font-bold uppercase tracking-wide text-slate-500">
              Externí URL / veřejná URL obrázku
            </span>
            <input
              type="url"
              disabled={disabled}
              value={imageUrl ?? ''}
              onChange={(event) => onImageUrlChange(event.target.value)}
              placeholder="https://..."
              className="mt-1 w-full rounded-xl border border-white/10 bg-slate-900 p-3 text-sm font-medium text-slate-100 outline-none transition placeholder:text-slate-600 focus:border-blue-400/70 focus:ring-2 focus:ring-blue-500/20 disabled:bg-transparent disabled:text-slate-500"
            />
          </label>

          <div className="grid gap-2 sm:flex sm:flex-wrap">
            <label className="inline-flex cursor-pointer items-center rounded-xl bg-blue-500/10 px-4 py-2 text-sm font-bold text-blue-300 transition hover:bg-blue-500/20">
              Nahrát soubor
              <input
                id={`${id}-upload`}
                type="file"
                disabled={disabled || uploading}
                accept="image/*"
                onChange={(event) => {
                  void handleUpload(event.target.files?.[0] ?? null);
                  event.target.value = '';
                }}
                className="hidden"
              />
            </label>
            <button
              type="button"
              disabled={disabled || importing || !imageUrl?.trim()}
              onClick={handleImportUrl}
              className="rounded-xl bg-violet-500/10 px-4 py-2 text-sm font-bold text-violet-300 transition hover:bg-violet-500/20 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {importing ? 'Přebírám...' : 'Převzít URL'}
            </button>
            {imageUrl && (
              <button
                type="button"
                disabled={disabled}
                onClick={() => onImageUrlChange('')}
                className="rounded-xl bg-rose-500/10 px-4 py-2 text-sm font-bold text-rose-300 ring-1 ring-rose-500/20 hover:bg-rose-500/20 disabled:cursor-not-allowed disabled:opacity-50"
              >
                Odebrat
              </button>
            )}
          </div>

          {!compact && (
            <p className="text-xs font-medium text-slate-500">
              Upload i převzetí jen připraví URL. Změnu článku uloží až tlačítko v kartě.
            </p>
          )}

          {localMessage && (
            <p className="break-words rounded-xl bg-slate-900 px-3 py-2 text-xs font-semibold text-slate-300 ring-1 ring-white/10">
              {localMessage}
            </p>
          )}
        </div>
      </div>

      {canEditAlt && (!compact || creditOpen) && (
        <div className="mt-5 border-t border-white/10 pt-5">
          <h4 className="text-xs font-black uppercase tracking-wide text-slate-300">
            Popisek / alt podle jazyka
          </h4>
          <div className="mt-3 grid gap-3 md:grid-cols-2">
            {altLocales.map((locale) => (
              <label key={locale} className="block">
                <span className="text-xs font-bold uppercase text-slate-500">
                  {locale}
                </span>
                <input
                  disabled={disabled}
                  value={altValues?.[locale] ?? ''}
                  onChange={(event) => onAltChange?.(locale, event.target.value)}
                  className="mt-1 w-full rounded-xl border border-white/10 bg-slate-900 p-3 text-sm text-slate-100 outline-none transition focus:border-blue-400/70 focus:ring-2 focus:ring-blue-500/20 disabled:bg-transparent disabled:text-slate-500"
                />
              </label>
            ))}
          </div>
        </div>
      )}

      {canEditCredit && (
        <div className="mt-5 border-t border-white/10 pt-5">
          <div className="mb-3 flex items-center justify-between gap-3 rounded-xl bg-slate-900 px-3 py-2">
            <div className="min-w-0">
              <h4 className="text-xs font-black uppercase tracking-wide text-slate-300">
                Zdroj, licence a popisky obrázku
              </h4>
              <p className="mt-1 truncate text-xs font-medium text-slate-500">
                {creditSummary(credit)}
              </p>
            </div>
            <div className="flex shrink-0 items-center gap-3">
              {hasImageCredit(credit) && !disabled && (!compact || creditOpen) && (
                <button
                  type="button"
                  onClick={() => onCreditChange?.({})}
                  className="text-xs font-bold text-slate-500 hover:text-rose-300"
                >
                  Vyčistit
                </button>
              )}
              {compact && (
                <button
                  type="button"
                  onClick={() => setCreditOpen((value) => !value)}
                  className="text-xs font-bold text-slate-400 hover:text-white"
                >
                  {creditOpen ? 'Skrýt' : 'Upravit'}
                </button>
              )}
            </div>
          </div>

          {(!compact || creditOpen) && (
          <div className="grid gap-3 md:grid-cols-2">
            <label className="block md:col-span-2">
              <span className="text-xs font-bold uppercase text-slate-500">
                Kredit pod obrázkem / attribution text
              </span>
              <input
                disabled={disabled}
                value={credit?.attribution_text ?? ''}
                onChange={(event) => updateCredit('attribution_text', event.target.value)}
                placeholder="např. John Doe / Wikimedia Commons"
                className="mt-1 w-full rounded-xl border border-white/10 bg-slate-900 p-3 text-sm text-slate-100 outline-none transition placeholder:text-slate-600 focus:border-blue-400/70 focus:ring-2 focus:ring-blue-500/20 disabled:bg-transparent disabled:text-slate-500"
              />
            </label>

            <label className="block">
              <span className="text-xs font-bold uppercase text-slate-500">Autor</span>
              <input
                disabled={disabled}
                value={credit?.author_name ?? ''}
                onChange={(event) => updateCredit('author_name', event.target.value)}
                className="mt-1 w-full rounded-xl border border-white/10 bg-slate-900 p-3 text-sm text-slate-100 outline-none transition focus:border-blue-400/70 focus:ring-2 focus:ring-blue-500/20 disabled:bg-transparent disabled:text-slate-500"
              />
            </label>
            <label className="block">
              <span className="text-xs font-bold uppercase text-slate-500">URL autora</span>
              <input
                type="url"
                disabled={disabled}
                value={credit?.author_url ?? ''}
                onChange={(event) => updateCredit('author_url', event.target.value)}
                className="mt-1 w-full rounded-xl border border-white/10 bg-slate-900 p-3 text-sm text-slate-100 outline-none transition focus:border-blue-400/70 focus:ring-2 focus:ring-blue-500/20 disabled:bg-transparent disabled:text-slate-500"
              />
            </label>
            <label className="block">
              <span className="text-xs font-bold uppercase text-slate-500">Licence</span>
              <input
                disabled={disabled}
                value={credit?.license_name ?? ''}
                onChange={(event) => updateCredit('license_name', event.target.value)}
                placeholder="např. CC BY-SA 4.0"
                className="mt-1 w-full rounded-xl border border-white/10 bg-slate-900 p-3 text-sm text-slate-100 outline-none transition placeholder:text-slate-600 focus:border-blue-400/70 focus:ring-2 focus:ring-blue-500/20 disabled:bg-transparent disabled:text-slate-500"
              />
            </label>
            <label className="block">
              <span className="text-xs font-bold uppercase text-slate-500">URL licence</span>
              <input
                type="url"
                disabled={disabled}
                value={credit?.license_url ?? ''}
                onChange={(event) => updateCredit('license_url', event.target.value)}
                className="mt-1 w-full rounded-xl border border-white/10 bg-slate-900 p-3 text-sm text-slate-100 outline-none transition focus:border-blue-400/70 focus:ring-2 focus:ring-blue-500/20 disabled:bg-transparent disabled:text-slate-500"
              />
            </label>
            <label className="block">
              <span className="text-xs font-bold uppercase text-slate-500">Zdroj</span>
              <input
                disabled={disabled}
                value={credit?.source_name ?? credit?.source ?? ''}
                onChange={(event) => updateCredit('source_name', event.target.value)}
                placeholder="např. Wikimedia Commons"
                className="mt-1 w-full rounded-xl border border-white/10 bg-slate-900 p-3 text-sm text-slate-100 outline-none transition placeholder:text-slate-600 focus:border-blue-400/70 focus:ring-2 focus:ring-blue-500/20 disabled:bg-transparent disabled:text-slate-500"
              />
            </label>
            <label className="block">
              <span className="text-xs font-bold uppercase text-slate-500">URL zdroje</span>
              <input
                type="url"
                disabled={disabled}
                value={credit?.source_url ?? ''}
                onChange={(event) => updateCredit('source_url', event.target.value)}
                className="mt-1 w-full rounded-xl border border-white/10 bg-slate-900 p-3 text-sm text-slate-100 outline-none transition focus:border-blue-400/70 focus:ring-2 focus:ring-blue-500/20 disabled:bg-transparent disabled:text-slate-500"
              />
            </label>
          </div>
          )}
        </div>
      )}
    </section>
  );
}
