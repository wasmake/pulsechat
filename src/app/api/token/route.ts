import { StreamClient } from '@stream-io/node-sdk';

import { auth } from '@/lib/auth';

const API_KEY = process.env.NEXT_PUBLIC_STREAM_API_KEY!;
const SECRET = process.env.STREAM_API_SECRET!;

export async function POST(request: Request) {
  const session = await auth.api.getSession({ headers: request.headers });
  if (!session) {
    return Response.json({ error: 'Authentication required' }, { status: 401 });
  }

  const client = new StreamClient(API_KEY, SECRET);
  const { user } = session;

  await client.upsertUsers([
    {
      id: user.id,
      role: 'user',
      name: user.name,
      image: user.image || undefined,
      custom: { email: user.email },
    },
  ]);

  const token = client.generateUserToken({ user_id: user.id });

  const response = {
    userId: user.id,
    token: token,
  };

  return Response.json(response);
}
