import { NextResponse } from 'next/server';

import { auth } from '@/lib/auth';
import prisma from '@/lib/prisma';

export async function GET(
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

  const userId = session.user.id;

  const workspaceId = (await params).workspaceId;

  if (!workspaceId || Array.isArray(workspaceId)) {
    return NextResponse.json(
      { error: 'Invalid workspace ID' },
      { status: 400 }
    );
  }

  try {
    // Check if the user is a member of the workspace
    const membership = await prisma.membership.findUnique({
      where: {
        userId_workspaceId: {
          userId,
          workspaceId,
        },
      },
    });

    if (!membership) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 });
    }

    // Fetch the workspace along with related data
    const workspace = await prisma.workspace.findUnique({
      where: { id: workspaceId },
      include: {
        channels: true,
        memberships: true,
        invitations: {
          where: { acceptedAt: null },
        },
      },
    });

    if (!workspace) {
      return NextResponse.json(
        { error: 'Workspace not found' },
        { status: 404 }
      );
    }

    const memberProfiles = await prisma.user.findMany({
      where: { id: { in: workspace.memberships.map(({ userId }) => userId) } },
      select: { id: true, name: true, email: true, image: true },
    });
    const profilesById = new Map(
      memberProfiles.map((profile) => [profile.id, profile])
    );
    const workspaceWithProfiles = {
      ...workspace,
      memberships: workspace.memberships.map((item) => ({
        ...item,
        user: profilesById.get(item.userId) ?? {
          id: item.userId,
          name: item.email,
          email: item.email,
          image: null,
        },
      })),
    };

    // Fetch the other workspaces the user is a member of excluding the current workspace
    const otherWorkspaces = await prisma.workspace.findMany({
      where: {
        memberships: {
          some: {
            userId,
            workspaceId: { not: workspaceId },
          },
        },
      },
      include: {
        channels: true,
        memberships: true,
        invitations: {
          where: { acceptedAt: null },
        },
      },
    });
    const otherMemberProfiles = await prisma.user.findMany({
      where: {
        id: {
          in: otherWorkspaces.flatMap((item) =>
            item.memberships.map(({ userId }) => userId)
          ),
        },
      },
      select: { id: true, name: true, email: true, image: true },
    });
    const otherProfilesById = new Map(
      otherMemberProfiles.map((profile) => [profile.id, profile])
    );
    const otherWorkspacesWithProfiles = otherWorkspaces.map((item) => ({
      ...item,
      memberships: item.memberships.map((membership) => ({
        ...membership,
        user: otherProfilesById.get(membership.userId) ?? {
          id: membership.userId,
          name: membership.email,
          email: membership.email,
          image: null,
        },
      })),
    }));

    return NextResponse.json(
      {
        workspace: workspaceWithProfiles,
        otherWorkspaces: otherWorkspacesWithProfiles,
      },
      { status: 200 }
    );
  } catch (error) {
    console.error('Error fetching workspace:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function PATCH(
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
  const workspace = await prisma.workspace.findUnique({
    where: { id: workspaceId },
    select: { ownerId: true },
  });
  if (!workspace) {
    return NextResponse.json({ error: 'Workspace not found' }, { status: 404 });
  }
  if (workspace.ownerId !== session.user.id) {
    return NextResponse.json({ error: 'Access denied' }, { status: 403 });
  }

  const body = await request.json();
  const name = typeof body.name === 'string' ? body.name.trim() : '';
  const image = typeof body.image === 'string' ? body.image.trim() : '';
  const accentColor =
    typeof body.accentColor === 'string' ? body.accentColor.toLowerCase() : '';

  if (!name || name.length > 80) {
    return NextResponse.json(
      { error: 'Workspace name must be between 1 and 80 characters' },
      { status: 400 }
    );
  }
  if (!/^#[0-9a-f]{6}$/.test(accentColor)) {
    return NextResponse.json(
      { error: 'Invalid accent color' },
      { status: 400 }
    );
  }
  if (image) {
    try {
      const imageUrl = new URL(image);
      if (!['http:', 'https:'].includes(imageUrl.protocol)) throw new Error();
    } catch {
      return NextResponse.json({ error: 'Invalid image URL' }, { status: 400 });
    }
  }

  const updatedWorkspace = await prisma.workspace.update({
    where: { id: workspaceId },
    data: { name, image: image || null, accentColor },
  });

  return NextResponse.json({ workspace: updatedWorkspace });
}
