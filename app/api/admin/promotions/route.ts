import { NextRequest, NextResponse } from 'next/server';
import {
  verifyAdminRequest,
  validatePromotionRecord,
} from '@/lib/adminAuth';
import type { SupportedLocale, PartnerOfferLink } from '@/lib/articleTypes';

const LOCALES: SupportedLocale[] = ['cs', 'en', 'de', 'fr', 'es'];

function normalizePromotionLinks(
  rawLinks: Record<string, unknown>,
  articleSlug: string,
  campaignId: string
): Record<SupportedLocale, PartnerOfferLink> {
  const result = {} as Record<SupportedLocale, PartnerOfferLink>;
  for (const loc of LOCALES) {
    const item = (rawLinks as Record<string, PartnerOfferLink>)[loc];
    let sourceUrl = item.sourceUrl;
    if (!sourceUrl && item.url) {
      try {
        const u = new URL(item.url).searchParams.get('u');
        if (u) sourceUrl = u;
      } catch {}
    }
    result[loc] = {
      url: item.url,
      subId: item.subId || `eu_${loc}_${articleSlug}_${campaignId}_end_v1`,
      ...(sourceUrl ? { sourceUrl } : {}),
    };
  }
  return result;
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
  const slug = searchParams.get('slug');
  let query = db
    .from('article_promotions')
    .select('*')
    .order('created_at', { ascending: false });

  if (slug) query = query.eq('article_slug', slug);

  const { data, error } = await query;
  if (error) {
    return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
  }
  return NextResponse.json({ ok: true, promotions: data });
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

  const validation = validatePromotionRecord(body);
  if (!validation.valid) {
    return NextResponse.json({ ok: false, error: validation.error }, { status: 400 });
  }

  const articleSlug = String(body.article_slug).trim();
  const { data: articleRow, error: articleLookupError } = await auth.writeClient
    .from('articles')
    .select('id')
    .eq('slug', articleSlug)
    .maybeSingle();

  if (articleLookupError) {
    return NextResponse.json({ ok: false, error: `Article lookup failed: ${articleLookupError.message}` }, { status: 500 });
  }
  if (!articleRow?.id) {
    return NextResponse.json({ ok: false, error: 'Article not found for promotion slug' }, { status: 400 });
  }

  const { data, error } = await auth.writeClient
    .from('article_promotions')
    .insert({
      article_slug: articleSlug,
      article_id: articleRow.id,
      campaign_id: String(body.campaign_id).trim(),
      provider: String(body.provider).trim(),
      placement: String(body.placement || 'article_bottom'),
      title: body.title,
      description: body.description,
      call_to_action: body.call_to_action || {},
      links: normalizePromotionLinks(body.links as Record<string, unknown>, articleSlug, String(body.campaign_id).trim()),
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
  return NextResponse.json({ ok: true, promotion: data }, { status: 201 });
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
    return NextResponse.json({ ok: false, error: 'Missing promotion id' }, { status: 400 });
  }
  if (expectedVersion === undefined) {
    return NextResponse.json({ ok: false, error: 'A positive integer version is required' }, { status: 400 });
  }

  const { data: existing, error: fetchError } = await auth.writeClient
    .from('article_promotions')
    .select('*')
    .eq('id', id)
    .maybeSingle();

  if (fetchError) {
    return NextResponse.json({ ok: false, error: fetchError.message }, { status: 500 });
  }
  if (!existing) {
    return NextResponse.json({ ok: false, error: 'Promotion not found' }, { status: 404 });
  }

  const merged = { ...existing, ...body } as Record<string, unknown>;
  const validation = validatePromotionRecord(merged);
  if (!validation.valid) {
    return NextResponse.json({ ok: false, error: validation.error }, { status: 400 });
  }

  const articleSlug = String(merged.article_slug).trim();
  let articleId = existing.article_id;
  if (articleSlug !== existing.article_slug || !articleId) {
    const { data: articleRow, error: articleLookupError } = await auth.writeClient
      .from('articles')
      .select('id')
      .eq('slug', articleSlug)
      .maybeSingle();
    if (articleLookupError) {
      return NextResponse.json({ ok: false, error: `Article lookup failed: ${articleLookupError.message}` }, { status: 500 });
    }
    if (!articleRow?.id) {
      return NextResponse.json({ ok: false, error: 'Article not found for promotion slug' }, { status: 400 });
    }
    articleId = articleRow.id;
  }

  const { data: updated, error: updateError } = await auth.writeClient
    .from('article_promotions')
    .update({
      article_slug: articleSlug,
      article_id: articleId,
      campaign_id: String(merged.campaign_id).trim(),
      provider: String(merged.provider).trim(),
      placement: String(merged.placement || 'article_bottom'),
      title: merged.title,
      description: merged.description,
      call_to_action: merged.call_to_action || {},
      links: normalizePromotionLinks(merged.links as Record<string, unknown>, articleSlug, String(merged.campaign_id).trim()),
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
  return NextResponse.json({ ok: true, promotion: updated });
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
    return NextResponse.json({ ok: false, error: 'Missing promotion id' }, { status: 400 });
  }
  if (expectedVersion === undefined) {
    return NextResponse.json({ ok: false, error: 'A positive integer version is required' }, { status: 400 });
  }

  const { data: deleted, error } = await auth.writeClient
    .from('article_promotions')
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
  return NextResponse.json({ ok: true });
}
