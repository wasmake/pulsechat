import { NextResponse } from 'next/server';

import { auth } from '@/lib/auth';
import { generateChannelId } from '@/lib/utils';
import prisma from '@/lib/prisma';
import { getWorkspaceAccess } from '@/lib/workspace-access';

export async function POST(
  request: Request,
  { params }: { params: Promise<{ workspaceId: string }> }
) {
  const session = await auth.api.getSession({ headers: request.headers });

  if (!session) {
    return NextResponse.json(
      { error: 'Authentication required' },
      { status: 401 }
    );
  }

  const workspaceId = (await params).workspaceId;

  if (!workspaceId || Array.isArray(workspaceId)) {
    return NextResponse.json(
      { error: 'Invalid workspace ID' },
      { status: 400 }
    );
  }

  try {
    const body = await request.json();
    const { name, description } = body;

    if (!name || typeof name !== 'string' || name.trim() === '') {
      return NextResponse.json(
        { error: 'Channel name is required' },
        { status: 400 }
      );
    }

    const access = await getWorkspaceAccess(workspaceId, session.user);
    if (!access?.can('manage_channels')) {
      return NextResponse.json(
        { error: 'Access denied: Insufficient permissions' },
        { status: 403 }
      );
    }

    // Check if a channel with the same name already exists in the workspace
    const existingChannel = await prisma.channel.findFirst({
      where: {
        name,
        workspaceId,
      },
    });

    if (existingChannel) {
      return NextResponse.json(
        {
          error: 'A channel with this name already exists in the workspace',
        },
        { status: 400 }
      );
    }

    // Create the new channel
    const newChannel = await prisma.channel.create({
      data: {
        id: generateChannelId(),
        name,
        description,
        workspaceId,
      },
    });

    return NextResponse.json(
      {
        message: 'Channel created successfully',
        channel: newChannel,
      },
      { status: 201 }
    );
  } catch (error) {
    console.error('Error creating channel:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
