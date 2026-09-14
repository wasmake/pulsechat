import { NextResponse } from 'next/server';
import { StreamChat } from 'stream-chat';

import { auth } from '@/lib/auth';
import prisma from '@/lib/prisma';
import { getWorkspaceAccess } from '@/lib/workspace-access';

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ workspaceId: string; channelId: string }> }
) {
  const session = await auth.api.getSession({ headers: request.headers });
  if (!session)
    return NextResponse.json(
      { error: 'Authentication required' },
      { status: 401 }
    );

  const { workspaceId, channelId } = await params;
  const access = await getWorkspaceAccess(workspaceId, session.user);
  if (!access?.can('manage_channels')) {
    return NextResponse.json({ error: 'Access denied' }, { status: 403 });
  }

  const body = await request.json().catch(() => null);
  const name =
    typeof body?.name === 'string' ? body.name.trim().toLowerCase() : '';
  const description =
    typeof body?.description === 'string' ? body.description.trim() : '';
  if (!/^[a-z0-9][a-z0-9-_]{0,79}$/.test(name)) {
    return NextResponse.json(
      { error: 'Use 1–80 lowercase letters, numbers, hyphens, or underscores' },
      { status: 400 }
    );
  }
  if (description.length > 250) {
    return NextResponse.json(
      { error: 'Description is too long' },
      { status: 400 }
    );
  }
  const duplicate = await prisma.channel.findFirst({
    where: { workspaceId, name, id: { not: channelId } },
    select: { id: true },
  });
  if (duplicate)
    return NextResponse.json(
      { error: 'That channel name is already in use' },
      { status: 409 }
    );

  const existing = await prisma.channel.findFirst({
    where: { id: channelId, workspaceId },
    select: { id: true },
  });
  if (!existing)
    return NextResponse.json({ error: 'Channel not found' }, { status: 404 });

  const channel = await prisma.channel.update({
    where: { id: channelId },
    data: { name, description: description || null },
  });

  const apiKey = process.env.NEXT_PUBLIC_STREAM_API_KEY;
  const secret = process.env.STREAM_API_SECRET;
  if (apiKey && secret) {
    try {
      const stream = StreamChat.getInstance(apiKey, secret);
      await stream.channel('messaging', channelId).updatePartial({
        set: { name, description: description || '' },
      });
    } catch (streamError) {
      console.error(
        'Unable to synchronize channel metadata with Stream',
        streamError
      );
    }
  }

  return NextResponse.json({ channel });
}
