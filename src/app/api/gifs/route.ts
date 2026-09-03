import { auth } from '@/lib/auth';

type KlipyImage = {
  url?: string;
  width?: number;
  height?: number;
};

type KlipyResult = {
  id: string | number;
  slug: string;
  title?: string;
  file?: {
    sm?: { gif?: KlipyImage; webp?: KlipyImage };
    md?: { gif?: KlipyImage; webp?: KlipyImage };
    hd?: { gif?: KlipyImage; webp?: KlipyImage };
  };
};

const getSessionAndKey = async (request: Request) => {
  const session = await auth.api.getSession({ headers: request.headers });
  return { session, key: process.env.KLIPY_API_KEY };
};

export async function GET(request: Request) {
  const { session, key } = await getSessionAndKey(request);
  if (!session) {
    return Response.json({ error: 'Authentication required' }, { status: 401 });
  }
  if (!key) {
    return Response.json(
      { error: 'KLIPY GIF search is not configured' },
      { status: 503 }
    );
  }

  const requestUrl = new URL(request.url);
  const query =
    requestUrl.searchParams.get('query')?.trim().slice(0, 100) || '';
  const page = Math.max(
    1,
    Math.min(20, Number(requestUrl.searchParams.get('page')) || 1)
  );
  const endpoint = query ? 'search' : 'trending';
  const klipyUrl = new URL(
    `https://api.klipy.com/api/v1/${encodeURIComponent(key)}/gifs/${endpoint}`
  );
  klipyUrl.searchParams.set('page', String(page));
  klipyUrl.searchParams.set('per_page', '24');
  klipyUrl.searchParams.set('customer_id', session.user.id);
  klipyUrl.searchParams.set('content_filter', 'medium');
  klipyUrl.searchParams.set('format_filter', 'gif,webp');
  if (query) klipyUrl.searchParams.set('q', query);

  const response = await fetch(klipyUrl, {
    next: { revalidate: query ? 0 : 300 },
  });
  if (!response.ok) {
    return Response.json(
      { error: 'Unable to load GIFs from KLIPY' },
      { status: 502 }
    );
  }
  const payload = (await response.json()) as {
    data?: { data?: KlipyResult[] };
  };
  const gifs = (payload.data?.data || []).flatMap((item) => {
    const preview = item.file?.sm?.webp || item.file?.sm?.gif;
    const image = item.file?.md?.gif || item.file?.hd?.gif;
    if (!preview?.url || !image?.url) return [];
    return [
      {
        id: String(item.id),
        slug: item.slug,
        title: item.title || 'GIF',
        previewUrl: preview.url,
        url: image.url,
        width: image.width || 200,
        height: image.height || 200,
        query,
      },
    ];
  });
  return Response.json({ gifs });
}

export async function POST(request: Request) {
  const { session, key } = await getSessionAndKey(request);
  if (!session || !key) return new Response(null, { status: 204 });
  const body = (await request.json()) as { slug?: unknown; query?: unknown };
  if (typeof body.slug !== 'string' || !/^[a-zA-Z0-9_-]+$/.test(body.slug)) {
    return Response.json({ error: 'Invalid GIF' }, { status: 400 });
  }
  await fetch(
    `https://api.klipy.com/api/v1/${encodeURIComponent(key)}/gifs/share/${body.slug}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        customer_id: session.user.id,
        q: typeof body.query === 'string' ? body.query.slice(0, 100) : '',
      }),
    }
  );
  return new Response(null, { status: 204 });
}
