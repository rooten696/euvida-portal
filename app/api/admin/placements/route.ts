import { NextRequest, NextResponse } from 'next/server';
import { revalidateTag, revalidatePath } from 'next/cache';
import {
  verifyAdminRequest,
  validatePlacementRecord,
} from '@/lib/adminAuth';

function invalidatePlacementsCache() {
  try {
    revalidateTag('ad_placements', 'max');
    revalidateTag('ad-placements', 'max');
    revalidatePath('/', 'layout');
  } catch {
    // Graceful fallback when executed in test/offline environments
  }
}

function parseVersion(value: unknown): number | undefined {
  const parsed = typeof value === 'number' ? value : Number(value);
  return Number.isInteger(parsed) && parsed >= 1 ? parsed : undefined;
}

export async function GET(request: NextRequest) {
  const auth = await verifyAdminRequest(request);
  const db = auth.writeClient || auth.client;
  if (!auth.authorized || !db) {
    return NextResponse.json({ ok: false, error: auth.error }, { status: auth.status });
  }

  const { searchParams } = new URL(request.url);
  const slot = searchParams.get('slot');
  let query = db
    .from('ad_placements')
    .select('*')
    .order('sort_order', { ascending: true })
    .order('created_at', { ascending: false });

  if (slot) query = query.eq('slot', slot);

  const { data, error } = await query;
  if (error) {
    return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
  }
  return NextResponse.json({ ok: true, placements: data });
}

export async function POST(request: NextRequest) {
  const auth = await verifyAdminRequest(request);
  if (!auth.authorized || !auth.writeClient) {
    return NextResponse.json({ ok: false, error: auth.error }, { status: auth.status });
  }

  const body = (await request.json().catch(() => null)) as Record<string, unknown> | null;
  if (!body) {
    return NextResponse.json({ ok: false, error: 'Invalid JSON body' }, { status: 400 });
  }

  const validation = validatePlacementRecord(body);
  if (!validation.valid) {
    return NextResponse.json({ ok: false, error: validation.error }, { status: 400 });
  }

  const { data, error } = await auth.writeClient
    .from('ad_placements')
    .insert({
      slot: body.slot,
      name: String(body.name).trim(),
      provider: body.provider,
      widget_type: body.widget_type,
      params: body.params || {},
      consent_category: body.consent_category || 'marketing',
      active: body.active !== false,
      sort_order: typeof body.sort_order === 'number' ? body.sort_order : 0,
      start_at: body.start_at || null,
      end_at: body.end_at || null,
      version: 1,
    })
    .select('*')
    .single();

  if (error) {
    return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
  }
  invalidatePlacementsCache();
  return NextResponse.json({ ok: true, placement: data }, { status: 201 });
}

export async function PATCH(request: NextRequest) {
  const auth = await verifyAdminRequest(request);
  if (!auth.authorized || !auth.writeClient) {
    return NextResponse.json({ ok: false, error: auth.error }, { status: auth.status });
  }

  const body = (await request.json().catch(() => null)) as Record<string, unknown> | null;
  if (!body) {
    return NextResponse.json({ ok: false, error: 'Invalid JSON body' }, { status: 400 });
  }

  const id = typeof body.id === 'string' ? body.id : '';
  const expectedVersion = parseVersion(body.version);
  if (!id) {
    return NextResponse.json({ ok: false, error: 'Missing placement id' }, { status: 400 });
  }
  if (expectedVersion === undefined) {
    return NextResponse.json({ ok: false, error: 'A positive integer version is required' }, { status: 400 });
  }

  const { data: existing, error: fetchError } = await auth.writeClient
    .from('ad_placements')
    .select('*')
    .eq('id', id)
    .maybeSingle();

  if (fetchError) {
    return NextResponse.json({ ok: false, error: fetchError.message }, { status: 500 });
  }
  if (!existing) {
    return NextResponse.json({ ok: false, error: 'Placement not found' }, { status: 404 });
  }

  const merged = { ...existing, ...body } as Record<string, unknown>;
  const validation = validatePlacementRecord(merged);
  if (!validation.valid) {
    return NextResponse.json({ ok: false, error: validation.error }, { status: 400 });
  }

  const { data: updated, error: updateError } = await auth.writeClient
    .from('ad_placements')
    .update({
      slot: merged.slot,
      name: String(merged.name).trim(),
      provider: merged.provider,
      widget_type: merged.widget_type,
      params: merged.params || {},
      consent_category: merged.consent_category || 'marketing',
      active: merged.active !== false,
      sort_order: typeof merged.sort_order === 'number' ? merged.sort_order : 0,
      start_at: merged.start_at || null,
      end_at: merged.end_at || null,
      version: expectedVersion + 1,
      updated_at: new Date().toISOString(),
    })
    .eq('id', id)
    .eq('version', expectedVersion)
    .select('*')
    .maybeSingle();

  if (updateError) {
    return NextResponse.json({ ok: false, error: updateError.message }, { status: 500 });
  }
  if (!updated) {
    return NextResponse.json({ ok: false, error: 'Optimistic lock error: version conflict' }, { status: 409 });
  }
  invalidatePlacementsCache();
  return NextResponse.json({ ok: true, placement: updated });
}

export async function DELETE(request: NextRequest) {
  const auth = await verifyAdminRequest(request);
  if (!auth.authorized || !auth.writeClient) {
    return NextResponse.json({ ok: false, error: auth.error }, { status: auth.status });
  }

  const { searchParams } = new URL(request.url);
  const id = searchParams.get('id');
  const expectedVersion = parseVersion(searchParams.get('version'));
  if (!id) {
    return NextResponse.json({ ok: false, error: 'Missing placement id' }, { status: 400 });
  }
  if (expectedVersion === undefined) {
    return NextResponse.json({ ok: false, error: 'A positive integer version is required' }, { status: 400 });
  }

  const { data: deleted, error } = await auth.writeClient
    .from('ad_placements')
    .delete()
    .eq('id', id)
    .eq('version', expectedVersion)
    .select('id')
    .maybeSingle();

  if (error) {
    return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
  }
  if (!deleted) {
    return NextResponse.json({ ok: false, error: 'Optimistic lock error: version conflict or record missing' }, { status: 409 });
  }
  invalidatePlacementsCache();
  return NextResponse.json({ ok: true });
}
