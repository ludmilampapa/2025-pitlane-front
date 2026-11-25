import { NextRequest, NextResponse } from 'next/server';

interface OFFHit {
  product_name?: string;
  nutriments?: {
    'energy-kcal_100g'?: number;
    'energy-kcal'?: number;
    'energy-kj_100g'?: number;
  };
}

const lookupBuckets = new Map<string, { count: number; resetAt: number }>();

export async function GET(request: NextRequest) {
  const ip = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 'local';
  const now = Date.now();
  if (lookupBuckets.size > 1000) {
    for (const [k, b] of lookupBuckets) {
      if (now > b.resetAt) lookupBuckets.delete(k);
    }
  }
  const bucket = lookupBuckets.get(ip);
  if (!bucket || now > bucket.resetAt) {
    lookupBuckets.set(ip, { count: 1, resetAt: now + 60_000 });
  } else {
    bucket.count += 1;
    if (bucket.count > 60) {
      return NextResponse.json({ kcal: null, error: 'Too many requests' }, { status: 429 });
    }
  }

  const query = request.nextUrl.searchParams.get('q')?.trim();
  if (!query || query.length > 80) {
    return NextResponse.json(
      { kcal: null, error: 'Invalid query parameter q (1-80 characters required)' },
      { status: 400 }
    );
  }

  try {
    const url = `https://search.openfoodfacts.org/search?q=${encodeURIComponent(
      query
    )}&fields=product_name,nutriments&page_size=8`;

    const response = await fetch(url, {
      headers: {
        Accept: 'application/json',
        'User-Agent': 'QueComemos/1.0 (https://quecomemos.app)',
      },
      next: { revalidate: 3600 },
    });

    if (!response.ok) {
      return NextResponse.json({ kcal: null }, { status: 200 });
    }

    const data = (await response.json()) as { hits?: OFFHit[] };
    const hits = Array.isArray(data?.hits) ? data.hits : [];

    for (const hit of hits) {
      const nutriments = hit.nutriments;
      if (!nutriments) continue;

      const rawKcal =
        typeof nutriments['energy-kcal_100g'] === 'number'
          ? nutriments['energy-kcal_100g']
          : typeof nutriments['energy-kcal'] === 'number'
            ? nutriments['energy-kcal']
            : typeof nutriments['energy-kj_100g'] === 'number'
              ? nutriments['energy-kj_100g'] / 4.184
              : null;

      if (rawKcal !== null && Number.isFinite(rawKcal) && rawKcal > 0) {
        return NextResponse.json(
          {
            kcal: Math.round(rawKcal),
            productName: hit.product_name || query,
            source: 'Open Food Facts',
          },
          { headers: { 'Cache-Control': 'public, max-age=3600' } }
        );
      }
    }

    return NextResponse.json({ kcal: null }, { status: 200 });
  } catch (error) {
    console.warn(
      'Open Food Facts lookup failed:',
      error instanceof Error ? error.message : 'Unknown error'
    );
    return NextResponse.json({ kcal: null }, { status: 200 });
  }
}
