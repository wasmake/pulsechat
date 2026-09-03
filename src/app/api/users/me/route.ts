import { mkdir, readdir, unlink, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { StreamClient } from '@stream-io/node-sdk';

import { auth } from '@/lib/auth';
import prisma from '@/lib/prisma';

export const runtime = 'nodejs';

const uploadDirectory =
  process.env.AVATAR_UPLOAD_DIR || path.join(process.cwd(), 'data', 'avatars');
const imageTypes: Record<string, string> = {
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'image/webp': 'webp',
  'image/gif': 'gif',
};

export async function PATCH(request: Request) {
  const session = await auth.api.getSession({ headers: request.headers });
  if (!session) {
    return Response.json({ error: 'Authentication required' }, { status: 401 });
  }

  const form = await request.formData();
  const name = String(form.get('name') || '').trim();
  const avatar = form.get('avatar');
  if (!name || name.length > 80) {
    return Response.json(
      { error: 'Display name must be between 1 and 80 characters' },
      { status: 400 }
    );
  }

  let image = session.user.image || null;
  if (avatar instanceof File && avatar.size > 0) {
    const extension = imageTypes[avatar.type];
    if (!extension) {
      return Response.json(
        { error: 'Avatar must be a JPG, PNG, WebP, or GIF image' },
        { status: 400 }
      );
    }
    if (avatar.size > 5 * 1024 * 1024) {
      return Response.json(
        { error: 'Avatar must be smaller than 5 MB' },
        { status: 400 }
      );
    }

    await mkdir(uploadDirectory, { recursive: true });
    const oldFiles = (await readdir(uploadDirectory)).filter((fileName) =>
      fileName.startsWith(`${session.user.id}.`)
    );
    await Promise.all(
      oldFiles.map((fileName) =>
        unlink(path.join(uploadDirectory, fileName)).catch(() => undefined)
      )
    );
    const fileName = `${session.user.id}.${extension}`;
    await writeFile(
      path.join(uploadDirectory, fileName),
      Buffer.from(await avatar.arrayBuffer())
    );
    const baseUrl = process.env.BETTER_AUTH_URL || new URL(request.url).origin;
    image = `${baseUrl}/api/users/avatar/${fileName}?v=${Date.now()}`;
  }

  const user = await prisma.user.update({
    where: { id: session.user.id },
    data: { name, image },
    select: { id: true, name: true, email: true, image: true },
  });

  const stream = new StreamClient(
    process.env.NEXT_PUBLIC_STREAM_API_KEY!,
    process.env.STREAM_API_SECRET!
  );
  await stream.upsertUsers([
    {
      id: user.id,
      role: 'user',
      name: user.name,
      image: user.image || undefined,
      custom: { email: user.email },
    },
  ]);

  return Response.json({ user });
}
