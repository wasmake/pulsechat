import { auth } from '@/lib/auth';
import prisma from '@/lib/prisma';

const isKlipyUrl = (value: unknown): value is string => {
  if (typeof value !== 'string') return false;
  try {
    const url = new URL(value);
    return (
      url.protocol === 'https:' &&
      ['static.klipy.com', 'static.klipy.co', 'static2.klipy.com'].includes(
        url.hostname
      )
    );
  } catch {
    return false;
  }
};

export async function GET(request: Request) {
  const session = await auth.api.getSession({ headers: request.headers });
  if (!session) {
    return Response.json({ error: 'Authentication required' }, { status: 401 });
  }
  const favorites = await prisma.favoriteGif.findMany({
    where: { userId: session.user.id },
    orderBy: { createdAt: 'desc' },
  });
  return Response.json({
    gifs: favorites.map((item) => ({
      id: item.providerId,
      slug: item.slug,
      title: item.title,
      previewUrl: item.previewUrl,
      url: item.url,
      width: item.width || 200,
      height: item.height || 200,
      query: '',
    })),
  });
}

export async function POST(request: Request) {
  const session = await auth.api.getSession({ headers: request.headers });
  if (!session) {
    return Response.json({ error: 'Authentication required' }, { status: 401 });
  }
  const body = (await request.json()) as Record<string, unknown>;
  if (
    typeof body.id !== 'string' ||
    !body.id ||
    typeof body.slug !== 'string' ||
    !/^[a-zA-Z0-9_-]+$/.test(body.slug) ||
    typeof body.title !== 'string' ||
    !isKlipyUrl(body.previewUrl) ||
    !isKlipyUrl(body.url)
  ) {
    return Response.json({ error: 'Invalid GIF' }, { status: 400 });
  }
  await prisma.favoriteGif.upsert({
    where: {
      userId_providerId: { userId: session.user.id, providerId: body.id },
    },
    create: {
      userId: session.user.id,
      providerId: body.id,
      slug: body.slug,
      title: body.title.slice(0, 191),
      previewUrl: body.previewUrl,
      url: body.url,
      width: typeof body.width === 'number' ? body.width : null,
      height: typeof body.height === 'number' ? body.height : null,
    },
    update: {
      slug: body.slug,
      title: body.title.slice(0, 191),
      previewUrl: body.previewUrl,
      url: body.url,
      width: typeof body.width === 'number' ? body.width : null,
      height: typeof body.height === 'number' ? body.height : null,
    },
  });
  return new Response(null, { status: 204 });
}
