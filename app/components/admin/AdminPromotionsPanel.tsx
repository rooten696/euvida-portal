'use client';

import React, { useCallback, useEffect, useState } from 'react';
import type { ArticlePromotion, SupportedLocale } from '@/lib/articleTypes';

const LOCALES: SupportedLocale[] = ['cs', 'en', 'de', 'fr', 'es'];

export default function AdminPromotionsPanel({
  accessToken,
}: {
  accessToken: string;
}) {
  const [promotions, setPromotions] = useState<ArticlePromotion[]>([]);
  const [loading, setLoading] = useState(false);
  const [filterSlug, setFilterSlug] = useState('');
  const [statusMessage, setStatusMessage] = useState('');
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingVersion, setEditingVersion] = useState<number | null>(null);
  const [editingMetadata, setEditingMetadata] = useState<{
    active: boolean;
    sort_order: number;
    start_at: string | null;
    end_at: string | null;
  } | null>(null);

  // Form state
  const [formSlug, setFormSlug] = useState('');
  const [formCampaignId, setFormCampaignId] = useState('stay');
  const [formProvider, setFormProvider] = useState('Booking.com');
  const [formPlacement, setFormPlacement] = useState('article_bottom');
  const [formTitle, setFormTitle] = useState<Record<string, string>>({ cs: '', en: '', de: '', fr: '', es: '' });
  const [formDesc, setFormDesc] = useState<Record<string, string>>({ cs: '', en: '', de: '', fr: '', es: '' });
  const [formCta, setFormCta] = useState<Record<string, string>>({ cs: '', en: '', de: '', fr: '', es: '' });
  const [formLinks, setFormLinks] = useState<Record<string, string>>({ cs: '', en: '', de: '', fr: '', es: '' });
  const [formSourceUrls, setFormSourceUrls] = useState<Record<string, string>>({ cs: '', en: '', de: '', fr: '', es: '' });

  const fetchPromotions = useCallback(async () => {
    if (!accessToken) return;
    setLoading(true);
    try {
      const res = await fetch('/api/admin/promotions', {
        headers: { authorization: `Bearer ${accessToken}` },
      });
      const data = await res.json();
      if (data.ok && Array.isArray(data.promotions)) {
        setPromotions(data.promotions);
      }
    } catch {
      setStatusMessage('Chyba při načítání promocí.');
    } finally {
      setLoading(false);
    }
  }, [accessToken]);

  useEffect(() => {
    fetchPromotions();
  }, [fetchPromotions]);

  const handleToggleActive = async (promo: ArticlePromotion) => {
    if (!promo.id) return;
    setStatusMessage(`Aktualizuji ${promo.article_slug}...`);
    try {
      const res = await fetch('/api/admin/promotions', {
        method: 'PATCH',
        headers: {
          authorization: `Bearer ${accessToken}`,
          'content-type': 'application/json',
        },
        body: JSON.stringify({
          id: promo.id,
          active: !promo.active,
          version: promo.version,
        }),
      });
      const data = await res.json();
      if (!res.ok || !data.ok) {
        setStatusMessage(`Chyba: ${data.error || res.statusText}`);
      } else {
        setStatusMessage(`Promoce pro ${promo.article_slug} ${!promo.active ? 'aktivována' : 'deaktivována'}.`);
        fetchPromotions();
      }
    } catch (err) {
      setStatusMessage(`Chyba při přepínání: ${err instanceof Error ? err.message : 'Neznámá'}`);
    }
  };

  const handleDelete = async (promo: ArticlePromotion) => {
    if (!promo.id) return;
    if (!window.confirm(`Opravdu smazat promoci ${promo.campaign_id} pro ${promo.article_slug}?`)) {
      return;
    }
    setStatusMessage(`Mažu ${promo.article_slug}...`);
    try {
      const res = await fetch(`/api/admin/promotions?id=${promo.id}&version=${promo.version}`, {
        method: 'DELETE',
        headers: { authorization: `Bearer ${accessToken}` },
      });
      const data = await res.json();
      if (!res.ok || !data.ok) {
        setStatusMessage(`Chyba mazání: ${data.error || res.statusText}`);
      } else {
        setStatusMessage(`Promoce pro ${promo.article_slug} smazána.`);
        fetchPromotions();
      }
    } catch (err) {
      setStatusMessage(`Chyba: ${err instanceof Error ? err.message : 'Neznámá'}`);
    }
  };

  const handleEdit = (promo: ArticlePromotion) => {
    if (!promo.id || !promo.version) return;
    setEditingId(promo.id);
    setEditingVersion(promo.version);
    setEditingMetadata({
      active: promo.active ?? true,
      sort_order: promo.sort_order ?? 0,
      start_at: promo.start_at ?? null,
      end_at: promo.end_at ?? null,
    });
    setFormSlug(promo.article_slug);
    setFormCampaignId(promo.campaign_id);
    setFormProvider(promo.provider);
    setFormPlacement(promo.placement || 'article_bottom');
    setFormTitle({ ...promo.title });
    setFormDesc({ ...promo.description });
    setFormCta({ ...(promo.call_to_action || {}) });
    setFormLinks(Object.fromEntries(LOCALES.map(loc => [loc, promo.links?.[loc]?.url || ''])));
    setFormSourceUrls(Object.fromEntries(LOCALES.map(loc => [loc, promo.links?.[loc]?.sourceUrl || ''])));
    setShowCreateForm(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setStatusMessage('Ukládám...');

    const linksPayload: Record<string, { url: string; subId: string; sourceUrl?: string }> = {};
    for (const loc of LOCALES) {
      const subId = `eu_${loc}_${formSlug}_${formCampaignId}_end_v1`;
      const url = formLinks[loc] || '';
      let sourceUrl = formSourceUrls[loc]?.trim() || undefined;
      if (!sourceUrl && url) {
        try {
          const u = new URL(url).searchParams.get('u');
          if (u) sourceUrl = u;
        } catch {}
      }
      linksPayload[loc] = {
        url,
        subId,
        ...(sourceUrl ? { sourceUrl } : {}),
      };
    }

    const payload = {
      article_slug: formSlug,
      campaign_id: formCampaignId,
      provider: formProvider,
      placement: formPlacement,
      title: formTitle,
      description: formDesc,
      call_to_action: formCta,
      links: linksPayload,
      active: editingMetadata?.active ?? true,
      sort_order: editingMetadata?.sort_order ?? 0,
      start_at: editingMetadata?.start_at ?? null,
      end_at: editingMetadata?.end_at ?? null,
    };

    try {
      const res = await fetch('/api/admin/promotions', {
        method: editingId ? 'PATCH' : 'POST',
        headers: {
          authorization: `Bearer ${accessToken}`,
          'content-type': 'application/json',
        },
        body: JSON.stringify(
          editingId ? { id: editingId, version: editingVersion, ...payload } : payload
        ),
      });
      const data = await res.json();
      if (!res.ok || !data.ok) {
        setStatusMessage(`Chyba uložení: ${data.error || 'Neznámá chyba'}`);
      } else {
        setStatusMessage('Promoce úspěšně uložena.');
        setShowCreateForm(false);
        setEditingId(null);
        setEditingVersion(null);
        setEditingMetadata(null);
        fetchPromotions();
      }
    } catch (err) {
      setStatusMessage(`Chyba: ${err instanceof Error ? err.message : 'Neznámá'}`);
    }
  };

  const filtered = promotions.filter(p =>
    filterSlug ? p.article_slug.toLowerCase().includes(filterSlug.toLowerCase()) : true
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h3 className="text-xl font-bold text-white">Správa promocí článků</h3>
          <p className="text-xs text-slate-400">
            Multilinguální affiliate nabídky (0..N na článek) uložené v tabulce article_promotions
          </p>
        </div>
        <button
          type="button"
          onClick={() => {
            setShowCreateForm(!showCreateForm);
            setEditingId(null);
            setEditingVersion(null);
            setEditingMetadata(null);
          }}
          className="rounded-xl bg-emerald-500 px-4 py-2 text-xs font-bold text-slate-950 hover:bg-emerald-400"
        >
          {showCreateForm ? 'Zavřít formulář' : '+ Přidat promoci'}
        </button>
      </div>

      {statusMessage && (
        <div className="rounded-xl border border-emerald-500/30 bg-emerald-950/40 p-3 text-xs text-emerald-300">
          {statusMessage}
        </div>
      )}

      {showCreateForm && (
        <form onSubmit={handleSave} className="space-y-4 rounded-2xl border border-white/10 bg-slate-900 p-5">
          <h4 className="font-bold text-emerald-400">
            {editingId ? 'Upravit promoci' : 'Nová promoce pro článek'}
          </h4>
          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <label className="text-[11px] font-semibold text-slate-400">Slug článku</label>
              <input
                type="text"
                required
                value={formSlug}
                onChange={e => setFormSlug(e.target.value)}
                placeholder="napr. hrad-bezdez"
                className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-xs text-white"
              />
            </div>
            <div>
              <label className="text-[11px] font-semibold text-slate-400">ID kampaně</label>
              <input
                type="text"
                required
                value={formCampaignId}
                onChange={e => setFormCampaignId(e.target.value)}
                placeholder="stay, tour, car_rental..."
                className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-xs text-white"
              />
            </div>
            <div>
              <label className="text-[11px] font-semibold text-slate-400">Provider</label>
              <input
                type="text"
                required
                value={formProvider}
                onChange={e => setFormProvider(e.target.value)}
                placeholder="Booking.com, GetYourGuide, Viator..."
                className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-xs text-white"
              />
            </div>
            <div>
              <label className="text-[11px] font-semibold text-slate-400">Umístění</label>
              <input
                type="text"
                value={formPlacement}
                onChange={e => setFormPlacement(e.target.value)}
                className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-xs text-white"
              />
            </div>
          </div>

          <div className="space-y-3">
            <h5 className="text-xs font-bold text-slate-300">Jazykové verze (cs, en, de, fr, es)</h5>
            {LOCALES.map(loc => (
              <div key={loc} className="grid gap-2 rounded-lg border border-slate-800 bg-slate-950/60 p-3 sm:grid-cols-5">
                <span className="font-mono text-xs font-bold uppercase text-emerald-400">{loc}</span>
                <input
                  type="text"
                  placeholder={`Titulek (${loc})`}
                  value={formTitle[loc] || ''}
                  onChange={e => setFormTitle({ ...formTitle, [loc]: e.target.value })}
                  className="rounded border border-slate-700 bg-slate-900 px-2 py-1 text-xs text-white"
                />
                <input
                  type="text"
                  placeholder={`Popis (${loc})`}
                  value={formDesc[loc] || ''}
                  onChange={e => setFormDesc({ ...formDesc, [loc]: e.target.value })}
                  className="rounded border border-slate-700 bg-slate-900 px-2 py-1 text-xs text-white"
                />
                <input
                  type="text"
                  placeholder={`CTA (${loc})`}
                  value={formCta[loc] || ''}
                  onChange={e => setFormCta({ ...formCta, [loc]: e.target.value })}
                  className="rounded border border-slate-700 bg-slate-900 px-2 py-1 text-xs text-white"
                />
                <input
                  type="text"
                  placeholder={`tp.media URL (${loc})`}
                  value={formLinks[loc] || ''}
                  onChange={e => setFormLinks({ ...formLinks, [loc]: e.target.value })}
                  className="rounded border border-slate-700 bg-slate-900 px-2 py-1 text-xs text-white"
                />
              </div>
            ))}

          </div>

          <div className="flex justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={() => setShowCreateForm(false)}
              className="rounded-lg border border-slate-700 px-3 py-1.5 text-xs text-slate-300"
            >
              Zrušit
            </button>
            <button
              type="submit"
              className="rounded-lg bg-emerald-500 px-4 py-1.5 text-xs font-bold text-slate-950 hover:bg-emerald-400"
            >
              Uložit promoci
            </button>
          </div>
        </form>
      )}

      <div className="flex items-center gap-3">
        <input
          type="text"
          placeholder="Hledat podle slugu článku..."
          value={filterSlug}
          onChange={e => setFilterSlug(e.target.value)}
          className="w-full max-w-sm rounded-xl border border-white/10 bg-slate-900 px-4 py-2 text-xs text-white placeholder:text-slate-500"
        />
        {loading && <span className="text-xs text-slate-400">Načítám...</span>}
      </div>

      <div className="overflow-x-auto rounded-2xl border border-white/10 bg-slate-900">
        <table className="w-full text-left text-xs">
          <thead className="border-b border-white/10 bg-slate-950 text-slate-400">
            <tr>
              <th className="p-3">Článek (slug)</th>
              <th className="p-3">Kampaň</th>
              <th className="p-3">Provider</th>
              <th className="p-3">Titulek (CS)</th>
              <th className="p-3">Stav</th>
              <th className="p-3 text-right">Akce</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-white/5">
            {filtered.map(promo => (
              <tr key={promo.id} className="hover:bg-slate-800/40">
                <td className="p-3 font-mono font-medium text-emerald-400">{promo.article_slug}</td>
                <td className="p-3 text-slate-300">{promo.campaign_id}</td>
                <td className="p-3 text-slate-300">{promo.provider}</td>
                <td className="p-3 text-white">{promo.title?.['cs'] || '-'}</td>
                <td className="p-3">
                  <span
                    className={`inline-flex rounded-full px-2 py-0.5 text-[10px] font-bold ${
                      promo.active ? 'bg-emerald-500/20 text-emerald-400' : 'bg-red-500/20 text-red-400'
                    }`}
                  >
                    {promo.active ? 'Aktivní' : 'Neaktivní'}
                  </span>
                </td>
                <td className="p-3 text-right">
                  <div className="inline-flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => handleEdit(promo)}
                      className="rounded bg-slate-800 px-2 py-1 text-[11px] font-semibold text-slate-300 hover:bg-slate-700"
                    >
                      Upravit
                    </button>
                    <button
                      type="button"
                      onClick={() => handleToggleActive(promo)}
                      className="rounded bg-slate-800 px-2 py-1 text-[11px] font-semibold text-slate-300 hover:bg-slate-700"
                    >
                      {promo.active ? 'Deaktivovat' : 'Aktivovat'}
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDelete(promo)}
                      className="rounded bg-red-950/60 px-2 py-1 text-[11px] font-semibold text-red-400 hover:bg-red-900"
                    >
                      Smazat
                    </button>
                  </div>
                </td>
              </tr>
            ))}
            {filtered.length === 0 && !loading && (
              <tr>
                <td colSpan={6} className="p-6 text-center text-slate-400">
                  Žádné promoce nenalezeny.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
