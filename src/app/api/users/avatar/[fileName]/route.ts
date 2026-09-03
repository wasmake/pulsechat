import { readFile } from 'node:fs/promises';
import path from 'node:path';

export const runtime = 'nodejs';

const uploadDirectory =
  process.env.AVATAR_UPLOAD_DIR || path.join(process.cwd(), 'data', 'avatars');
const contentTypes: Record<string, string> = {
  jpg: 'image/jpeg',
  png: 'image/png',
  webp: 'image/webp',
  gif: 'image/gif',
};

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ fileName: string }> }
) {
  const { fileName } = await params;
  const match = /^([a-zA-Z0-9_-]+)\.(jpg|png|webp|gif)$/.exec(fileName);
  if (!match) return new Response('Not found', { status: 404 });

  try {
    const file = await readFile(path.join(uploadDirectory, fileName));
    return new Response(file, {
      headers: {
        'Content-Type': contentTypes[match[2]],
        'Cache-Control': 'public, max-age=31536000, immutable',
      },
    });
  } catch {
    return new Response('Not found', { status: 404 });
  }
}
