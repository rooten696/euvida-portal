'use client';

import { supabase } from '@/lib/supabaseBrowserClient';
import type { ImageCredit, SupportedLocale } from '@/lib/articleTypes';
import { useId, useState } from 'react';

const imageBucket = process.env.NEXT_PUBLIC_SUPABASE_IMAGE_BUCKET ?? 'images';
const altLocales: SupportedLocale[] = ['cs', 'en', 'de', 'fr', 'es'];

type ImageManagerProps = {
  title: string;
  entityType: string;
  entityId?: string | null;
  imageUrl?: string | null;
  disabled?: boolean;
  altValues?: Partial<Record<SupportedLocale, string>>;
  credit?: ImageCredit | null;
  onImageUrlChange: (value: string) => void;
  onAltChange?: (locale: SupportedLocale, value: string) => void;
  onCreditChange?: (credit: ImageCredit) => void;
  onStatus?: (message: string) => void;
};

function safePathSegment(value: string): string {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-zA-Z0-9._-]+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '')
    .toLowerCase();
}

function hasImageCredit(credit: ImageCredit | null | undefined): boolean {
  if (!credit) {
    return false;
  }

  return Object.values(credit).some((value) => typeof value === 'string' && value.trim());
}

export default function ImageManager({
  title,
  entityType,
  entityId,
  imageUrl,
  disabled = false,
  altValues,
  credit,
  onImageUrlChange,
  onAltChange,
  onCreditChange,
  onStatus,
}: ImageManagerProps) {
  const id = useId();
  const [uploading, setUploading] = useState(false);
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

    const owner = safePathSegment(entityId || 'new');
    const fileName = safePathSegment(file.name) || `image-${Date.now()}`;
    const filePath = `${safePathSegment(entityType)}/${owner}/${Date.now()}-${fileName}`;

    const { error } = await supabase.storage
      .from(imageBucket)
      .upload(filePath, file, {
        cacheControl: '3600',
        contentType: file.type || 'application/octet-stream',
        upsert: true,
      });

    if (error) {
      const message = `Chyba uploadu: ${error.message}. Ověř bucket "${imageBucket}".`;
      setLocalMessage(message);
      onStatus?.(message);
      setUploading(false);
      return;
    }

    const { data } = supabase.storage.from(imageBucket).getPublicUrl(filePath);
    onImageUrlChange(data.publicUrl);
    setLocalMessage('Obrázek nahrán. Nezapomeň uložit formulář.');
    onStatus?.('Obrázek nahrán. Nezapomeň uložit formulář.');
    setUploading(false);
  };

  return (
    <section className="rounded-2xl border border-slate-200 bg-slate-50/70 p-4">
      <div className="mb-4 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div>
          <h3 className="text-sm font-black uppercase tracking-wide text-slate-700">
            {title}
          </h3>
          <p className="mt-1 text-xs font-medium text-slate-500">
            Externí URL nebo upload do Supabase Storage bucketu `{imageBucket}`.
          </p>
        </div>
        {imageUrl && (
          <button
            type="button"
            disabled={disabled}
            onClick={() => onImageUrlChange('')}
            className="rounded-full bg-white px-3 py-1.5 text-xs font-bold text-slate-600 shadow-sm ring-1 ring-slate-200 hover:text-red-600 disabled:cursor-not-allowed disabled:opacity-50"
          >
            Odebrat obrázek
          </button>
        )}
      </div>

      <div className="grid gap-4 lg:grid-cols-[220px_1fr]">
        <div className="relative min-h-36 overflow-hidden rounded-xl border border-slate-200 bg-white shadow-inner">
          {imageUrl ? (
            <div
              className="absolute inset-0 bg-cover bg-center"
              style={{ backgroundImage: `url("${imageUrl}")` }}
            />
          ) : (
            <div className="flex h-full min-h-36 items-center justify-center bg-[linear-gradient(135deg,#dbeafe_0%,#e0f2fe_40%,#fef3c7_100%)] px-4 text-center">
              <span className="rounded-full bg-white/80 px-3 py-1 text-xs font-black uppercase tracking-wide text-blue-950 shadow-sm">
                Bez obrázku
              </span>
            </div>
          )}
        </div>

        <div className="space-y-4">
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
              className="mt-1 w-full rounded-xl border border-slate-200 bg-white p-3 text-sm font-medium outline-none transition focus:border-blue-300 focus:ring-2 focus:ring-blue-100 disabled:bg-transparent disabled:text-slate-500"
            />
          </label>

          <label className="block">
            <span className="text-xs font-bold uppercase tracking-wide text-slate-500">
              Nahrát nový obrázek
            </span>
            <input
              id={`${id}-upload`}
              type="file"
              disabled={disabled || uploading}
              accept="image/*"
              onChange={(event) => {
                void handleUpload(event.target.files?.[0] ?? null);
                event.target.value = '';
              }}
              className="mt-1 block w-full rounded-xl border border-dashed border-slate-300 bg-white p-3 text-sm text-slate-600 file:mr-4 file:rounded-full file:border-0 file:bg-blue-50 file:px-3 file:py-1.5 file:text-xs file:font-bold file:text-blue-800 hover:file:bg-blue-100 disabled:cursor-not-allowed disabled:opacity-50"
            />
          </label>

          {localMessage && (
            <p className="rounded-xl bg-white px-3 py-2 text-xs font-semibold text-slate-600 ring-1 ring-slate-200">
              {localMessage}
            </p>
          )}
        </div>
      </div>

      {canEditAlt && (
        <div className="mt-5 border-t border-slate-200 pt-5">
          <h4 className="text-xs font-black uppercase tracking-wide text-slate-600">
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
                  className="mt-1 w-full rounded-xl border border-slate-200 bg-white p-3 text-sm outline-none transition focus:border-blue-300 focus:ring-2 focus:ring-blue-100 disabled:bg-transparent disabled:text-slate-500"
                />
              </label>
            ))}
          </div>
        </div>
      )}

      {canEditCredit && (
        <div className="mt-5 border-t border-slate-200 pt-5">
          <div className="mb-3 flex items-center justify-between gap-3">
            <h4 className="text-xs font-black uppercase tracking-wide text-slate-600">
              Kredit, licence a zdroj
            </h4>
            {hasImageCredit(credit) && !disabled && (
              <button
                type="button"
                onClick={() => onCreditChange?.({})}
                className="text-xs font-bold text-slate-500 hover:text-red-600"
              >
                Vyčistit kredit
              </button>
            )}
          </div>

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
                className="mt-1 w-full rounded-xl border border-slate-200 bg-white p-3 text-sm outline-none transition focus:border-blue-300 focus:ring-2 focus:ring-blue-100 disabled:bg-transparent disabled:text-slate-500"
              />
            </label>

            <label className="block">
              <span className="text-xs font-bold uppercase text-slate-500">Autor</span>
              <input
                disabled={disabled}
                value={credit?.author_name ?? ''}
                onChange={(event) => updateCredit('author_name', event.target.value)}
                className="mt-1 w-full rounded-xl border border-slate-200 bg-white p-3 text-sm outline-none transition focus:border-blue-300 focus:ring-2 focus:ring-blue-100 disabled:bg-transparent disabled:text-slate-500"
              />
            </label>
            <label className="block">
              <span className="text-xs font-bold uppercase text-slate-500">URL autora</span>
              <input
                type="url"
                disabled={disabled}
                value={credit?.author_url ?? ''}
                onChange={(event) => updateCredit('author_url', event.target.value)}
                className="mt-1 w-full rounded-xl border border-slate-200 bg-white p-3 text-sm outline-none transition focus:border-blue-300 focus:ring-2 focus:ring-blue-100 disabled:bg-transparent disabled:text-slate-500"
              />
            </label>
            <label className="block">
              <span className="text-xs font-bold uppercase text-slate-500">Licence</span>
              <input
                disabled={disabled}
                value={credit?.license_name ?? ''}
                onChange={(event) => updateCredit('license_name', event.target.value)}
                placeholder="např. CC BY-SA 4.0"
                className="mt-1 w-full rounded-xl border border-slate-200 bg-white p-3 text-sm outline-none transition focus:border-blue-300 focus:ring-2 focus:ring-blue-100 disabled:bg-transparent disabled:text-slate-500"
              />
            </label>
            <label className="block">
              <span className="text-xs font-bold uppercase text-slate-500">URL licence</span>
              <input
                type="url"
                disabled={disabled}
                value={credit?.license_url ?? ''}
                onChange={(event) => updateCredit('license_url', event.target.value)}
                className="mt-1 w-full rounded-xl border border-slate-200 bg-white p-3 text-sm outline-none transition focus:border-blue-300 focus:ring-2 focus:ring-blue-100 disabled:bg-transparent disabled:text-slate-500"
              />
            </label>
            <label className="block">
              <span className="text-xs font-bold uppercase text-slate-500">Zdroj</span>
              <input
                disabled={disabled}
                value={credit?.source_name ?? credit?.source ?? ''}
                onChange={(event) => updateCredit('source_name', event.target.value)}
                placeholder="např. Wikimedia Commons"
                className="mt-1 w-full rounded-xl border border-slate-200 bg-white p-3 text-sm outline-none transition focus:border-blue-300 focus:ring-2 focus:ring-blue-100 disabled:bg-transparent disabled:text-slate-500"
              />
            </label>
            <label className="block">
              <span className="text-xs font-bold uppercase text-slate-500">URL zdroje</span>
              <input
                type="url"
                disabled={disabled}
                value={credit?.source_url ?? ''}
                onChange={(event) => updateCredit('source_url', event.target.value)}
                className="mt-1 w-full rounded-xl border border-slate-200 bg-white p-3 text-sm outline-none transition focus:border-blue-300 focus:ring-2 focus:ring-blue-100 disabled:bg-transparent disabled:text-slate-500"
              />
            </label>
          </div>
        </div>
      )}
    </section>
  );
}
