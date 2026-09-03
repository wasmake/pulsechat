import { auth } from '@/lib/auth';
import prisma from '@/lib/prisma';

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ providerId: string }> }
) {
  const session = await auth.api.getSession({ headers: request.headers });
  if (!session) {
    return Response.json({ error: 'Authentication required' }, { status: 401 });
  }
  const { providerId } = await params;
  await prisma.favoriteGif.deleteMany({
    where: { userId: session.user.id, providerId },
  });
  return new Response(null, { status: 204 });
}
