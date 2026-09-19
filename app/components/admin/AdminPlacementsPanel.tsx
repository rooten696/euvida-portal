'use client';

import React, { useCallback, useEffect, useState } from 'react';
import type { AdPlacement, AdPlacementSlot } from '@/lib/articleTypes';
import { ALLOWED_AD_SLOTS, ALLOWED_AD_PROVIDERS, ALLOWED_CONSENT_CATEGORIES, WIDGET_CATALOG } from '@/lib/ad-placement-catalog';

export default function AdminPlacementsPanel({
  accessToken,
}: {
  accessToken: string;
}) {
  const [placements, setPlacements] = useState<AdPlacement[]>([]);
  const [loading, setLoading] = useState(false);
  const [filterSlot, setFilterSlot] = useState<string>('all');
  const [statusMessage, setStatusMessage] = useState('');
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingVersion, setEditingVersion] = useState<number | null>(null);
  const [editingMetadata, setEditingMetadata] = useState<{
    active: boolean;
    start_at: string | null;
    end_at: string | null;
  } | null>(null);

  // Form state
  const [formSlot, setFormSlot] = useState<AdPlacementSlot>('header');
  const [formName, setFormName] = useState('');
  const [formProvider, setFormProvider] = useState('travelpayouts');
  const [formWidgetType, setFormWidgetType] = useState('travelpayouts_banner');
  const [formConsent, setFormConsent] = useState('marketing');
  const [formSortOrder, setFormSortOrder] = useState('0');
  const [formParamsJson, setFormParamsJson] = useState('{\n  "title": "Doporučené ubytování",\n  "label": "Rezervovat",\n  "url": "https://tp.media/r?marker=776456&trs=572910&sub_id=eu_cs_global_banner&u=https%3A%2F%2Fwww.booking.com%2Fcity%2Fcz%2Fprague.html"\n}');

  const fetchPlacements = useCallback(async () => {
    if (!accessToken) return;
    setLoading(true);
    try {
      const url = filterSlot !== 'all' ? `/api/admin/placements?slot=${filterSlot}` : '/api/admin/placements';
      const res = await fetch(url, {
        headers: { authorization: `Bearer ${accessToken}` },
      });
      const data = await res.json();
      if (data.ok && Array.isArray(data.placements)) {
        setPlacements(data.placements);
      }
    } catch {
      setStatusMessage('Chyba při načítání umístění reklam.');
    } finally {
      setLoading(false);
    }
  }, [accessToken, filterSlot]);

  useEffect(() => {
    fetchPlacements();
  }, [fetchPlacements]);

  const handleToggleActive = async (placement: AdPlacement) => {
    if (!placement.id) return;
    setStatusMessage(`Aktualizuji ${placement.name}...`);
    try {
      const res = await fetch('/api/admin/placements', {
        method: 'PATCH',
        headers: {
          authorization: `Bearer ${accessToken}`,
          'content-type': 'application/json',
        },
        body: JSON.stringify({
          id: placement.id,
          active: !placement.active,
          version: placement.version,
        }),
      });
      const data = await res.json();
      if (!res.ok || !data.ok) {
        setStatusMessage(`Chyba: ${data.error || res.statusText}`);
      } else {
        setStatusMessage(`Umístění ${placement.name} ${!placement.active ? 'aktivováno' : 'deaktivováno'}.`);
        fetchPlacements();
      }
    } catch (err) {
      setStatusMessage(`Chyba při přepínání: ${err instanceof Error ? err.message : 'Neznámá'}`);
    }
  };

  const handleDelete = async (placement: AdPlacement) => {
    if (!placement.id) return;
    if (!window.confirm(`Opravdu smazat umístění ${placement.name}?`)) {
      return;
    }
    setStatusMessage(`Mažu ${placement.name}...`);
    try {
      const res = await fetch(`/api/admin/placements?id=${placement.id}&version=${placement.version}`, {
        method: 'DELETE',
        headers: { authorization: `Bearer ${accessToken}` },
      });
      const data = await res.json();
      if (!res.ok || !data.ok) {
        setStatusMessage(`Chyba mazání: ${data.error || res.statusText}`);
      } else {
        setStatusMessage(`Umístění ${placement.name} smazáno.`);
        fetchPlacements();
      }
    } catch (err) {
      setStatusMessage(`Chyba: ${err instanceof Error ? err.message : 'Neznámá'}`);
    }
  };

  const handleEdit = (placement: AdPlacement) => {
    if (!placement.id || !placement.version) return;
    setEditingId(placement.id);
    setEditingVersion(placement.version);
    setEditingMetadata({
      active: placement.active ?? true,
      start_at: placement.start_at ?? null,
      end_at: placement.end_at ?? null,
    });
    setFormSlot(placement.slot);
    setFormName(placement.name);
    setFormProvider(placement.provider);
    setFormWidgetType(placement.widget_type);
    setFormConsent(placement.consent_category);
    setFormSortOrder(String(placement.sort_order || 0));
    setFormParamsJson(JSON.stringify(placement.params || {}, null, 2));
    setShowCreateForm(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setStatusMessage('Ukládám...');

    let parsedParams: Record<string, unknown>;
    try {
      parsedParams = JSON.parse(formParamsJson);
    } catch {
      setStatusMessage('Chyba: parametry musí být platný JSON formát.');
      return;
    }

    const payload = {
      slot: formSlot,
      name: formName,
      provider: formProvider,
      widget_type: formWidgetType,
      params: parsedParams,
      consent_category: formConsent,
      sort_order: parseInt(formSortOrder, 10) || 0,
      active: editingMetadata?.active ?? true,
      start_at: editingMetadata?.start_at ?? null,
      end_at: editingMetadata?.end_at ?? null,
    };

    try {
      const res = await fetch('/api/admin/placements', {
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
        setStatusMessage('Umístění úspěšně uloženo.');
        setShowCreateForm(false);
        setEditingId(null);
        setEditingVersion(null);
        setEditingMetadata(null);
        fetchPlacements();
      }
    } catch (err) {
      setStatusMessage(`Chyba: ${err instanceof Error ? err.message : 'Neznámá'}`);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h3 className="text-xl font-bold text-white">Správa globálních reklamních umístění (Ad Placements)</h3>
          <p className="text-xs text-slate-400">
            Deklarativní widgety a bannery pro sloty header / panel / footer bez volného HTML/JS
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
          {showCreateForm ? 'Zavřít formulář' : '+ Přidat umístění'}
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
            {editingId ? 'Upravit umístění' : 'Nové reklamní umístění'}
          </h4>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            <div>
              <label className="text-[11px] font-semibold text-slate-400">Slot (umístění)</label>
              <select
                value={formSlot}
                onChange={e => setFormSlot(e.target.value as AdPlacementSlot)}
                className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-xs text-white"
              >
                {ALLOWED_AD_SLOTS.map(slot => (
                  <option key={slot} value={slot}>{slot}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-[11px] font-semibold text-slate-400">Název / identifikátor</label>
              <input
                type="text"
                required
                value={formName}
                onChange={e => setFormName(e.target.value)}
                placeholder="např. Header Travelpayouts letenky"
                className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-xs text-white"
              />
            </div>
            <div>
              <label className="text-[11px] font-semibold text-slate-400">Provider</label>
              <select
                value={formProvider}
                onChange={e => setFormProvider(e.target.value)}
                className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-xs text-white"
              >
                {ALLOWED_AD_PROVIDERS.map(prov => (
                  <option key={prov} value={prov}>{prov}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-[11px] font-semibold text-slate-400">Typ widgetu (z katalogu)</label>
              <select
                value={formWidgetType}
                onChange={e => setFormWidgetType(e.target.value)}
                className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-xs text-white"
              >
                {Object.keys(WIDGET_CATALOG).map(widgetKey => (
                  <option key={widgetKey} value={widgetKey}>{widgetKey}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-[11px] font-semibold text-slate-400">Kategorie souhlasu (Consent)</label>
              <select
                value={formConsent}
                onChange={e => setFormConsent(e.target.value)}
                className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-xs text-white"
              >
                {ALLOWED_CONSENT_CATEGORIES.map(cat => (
                  <option key={cat} value={cat}>{cat}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-[11px] font-semibold text-slate-400">Pořadí řazení</label>
              <input
                type="number"
                value={formSortOrder}
                onChange={e => setFormSortOrder(e.target.value)}
                className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-xs text-white"
              />
            </div>
          </div>

          <div>
            <label className="text-[11px] font-semibold text-slate-400">
              Parametry widgetu (JSON - ověřeno katalogem a allowlistem)
            </label>
            <textarea
              rows={5}
              required
              value={formParamsJson}
              onChange={e => setFormParamsJson(e.target.value)}
              className="mt-1 w-full font-mono rounded-lg border border-slate-700 bg-slate-950 p-3 text-xs text-emerald-300"
            />
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
              Uložit umístění
            </button>
          </div>
        </form>
      )}

      <div className="flex items-center gap-3">
        <span className="text-xs text-slate-400">Filtrovat slot:</span>
        <div className="inline-flex rounded-lg border border-white/10 bg-slate-950 p-1">
          {['all', ...ALLOWED_AD_SLOTS].map(slotOption => (
            <button
              key={slotOption}
              type="button"
              onClick={() => setFilterSlot(slotOption)}
              className={`rounded-md px-3 py-1 text-xs font-semibold ${
                filterSlot === slotOption ? 'bg-emerald-500 text-slate-950' : 'text-slate-400 hover:text-white'
              }`}
            >
              {slotOption}
            </button>
          ))}
        </div>
        {loading && <span className="text-xs text-slate-400">Načítám...</span>}
      </div>

      <div className="overflow-x-auto rounded-2xl border border-white/10 bg-slate-900">
        <table className="w-full text-left text-xs">
          <thead className="border-b border-white/10 bg-slate-950 text-slate-400">
            <tr>
              <th className="p-3">Slot</th>
              <th className="p-3">Název</th>
              <th className="p-3">Provider</th>
              <th className="p-3">Widget</th>
              <th className="p-3">Consent</th>
              <th className="p-3">Stav</th>
              <th className="p-3 text-right">Akce</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-white/5">
            {placements.map(placement => (
              <tr key={placement.id} className="hover:bg-slate-800/40">
                <td className="p-3 font-mono font-bold uppercase text-emerald-400">{placement.slot}</td>
                <td className="p-3 font-medium text-white">{placement.name}</td>
                <td className="p-3 text-slate-300">{placement.provider}</td>
                <td className="p-3 text-slate-300">{placement.widget_type}</td>
                <td className="p-3 text-slate-400">{placement.consent_category}</td>
                <td className="p-3">
                  <span
                    className={`inline-flex rounded-full px-2 py-0.5 text-[10px] font-bold ${
                      placement.active ? 'bg-emerald-500/20 text-emerald-400' : 'bg-red-500/20 text-red-400'
                    }`}
                  >
                    {placement.active ? 'Aktivní' : 'Neaktivní'}
                  </span>
                </td>
                <td className="p-3 text-right">
                  <div className="inline-flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => handleEdit(placement)}
                      className="rounded bg-slate-800 px-2 py-1 text-[11px] font-semibold text-slate-300 hover:bg-slate-700"
                    >
                      Upravit
                    </button>
                    <button
                      type="button"
                      onClick={() => handleToggleActive(placement)}
                      className="rounded bg-slate-800 px-2 py-1 text-[11px] font-semibold text-slate-300 hover:bg-slate-700"
                    >
                      {placement.active ? 'Deaktivovat' : 'Aktivovat'}
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDelete(placement)}
                      className="rounded bg-red-950/60 px-2 py-1 text-[11px] font-semibold text-red-400 hover:bg-red-900"
                    >
                      Smazat
                    </button>
                  </div>
                </td>
              </tr>
            ))}
            {placements.length === 0 && !loading && (
              <tr>
                <td colSpan={7} className="p-6 text-center text-slate-400">
                  Žádná reklamní umístění nenalezena.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
