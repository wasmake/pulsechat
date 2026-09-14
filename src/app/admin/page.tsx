import { randomUUID } from 'crypto';
import { headers } from 'next/headers';
import { notFound, redirect } from 'next/navigation';
import { revalidatePath } from 'next/cache';

import AdminPanel, { AdminWorkspace } from '@/components/AdminPanel';
import { auth } from '@/lib/auth';
import prisma from '@/lib/prisma';

const getSession = () => auth.api.getSession({ headers: headers() });

const requireOwner = async (workspaceId: string) => {
  const session = await getSession();
  if (!session) redirect('/sign-in');
  const workspace = await prisma.workspace.findFirst({
    where: { id: workspaceId, ownerId: session.user.id },
    select: { id: true, ownerId: true },
  });
  if (!workspace) throw new Error('Workspace not found or access denied');
  return { session, workspace };
};

export default async function AdminPage() {
  const session = await getSession();
  if (!session) redirect('/sign-in');

  const ownedWorkspaces = await prisma.workspace.findMany({
    where: { ownerId: session.user.id },
    orderBy: { name: 'asc' },
    include: {
      channels: { orderBy: { name: 'asc' }, select: { id: true, name: true } },
      memberships: { orderBy: { joinedAt: 'asc' } },
      invitations: {
        where: { acceptedAt: null },
        orderBy: { createdAt: 'desc' },
      },
    },
  });

  if (!ownedWorkspaces.length) notFound();

  const userIds = Array.from(
    new Set(
      ownedWorkspaces.flatMap((workspace) =>
        workspace.memberships.map((membership) => membership.userId)
      )
    )
  );
  const users = await prisma.user.findMany({
    where: { id: { in: userIds } },
    select: { id: true, name: true, email: true, image: true },
  });
  const usersById = new Map(users.map((user) => [user.id, user]));

  const workspaces: AdminWorkspace[] = ownedWorkspaces.map((workspace) => ({
    id: workspace.id,
    name: workspace.name,
    image: workspace.image,
    accentColor: workspace.accentColor,
    channels: workspace.channels,
    invitations: workspace.invitations.map((invitation) => ({
      id: invitation.id,
      email: invitation.email,
      createdAt: invitation.createdAt.toISOString(),
    })),
    members: workspace.memberships.map((membership) => {
      const user = usersById.get(membership.userId);
      return {
        id: membership.id,
        userId: membership.userId,
        name: user?.name || membership.email,
        email: user?.email || membership.email,
        image: user?.image || null,
        role: membership.role || 'member',
        joinedAt: membership.joinedAt?.toISOString() || null,
        isOwner: membership.userId === workspace.ownerId,
      };
    }),
  }));

  async function updateWorkspace(formData: FormData) {
    'use server';
    const workspaceId = String(formData.get('workspaceId') || '');
    await requireOwner(workspaceId);
    const name = String(formData.get('name') || '').trim();
    const accentColor = String(formData.get('accentColor') || '').toLowerCase();
    if (!name || name.length > 80) throw new Error('Invalid workspace name');
    if (!/^#[0-9a-f]{6}$/.test(accentColor)) {
      throw new Error('Invalid accent color');
    }
    await prisma.workspace.update({
      where: { id: workspaceId },
      data: { name, accentColor },
    });
    revalidatePath('/admin');
  }

  async function inviteUser(formData: FormData) {
    'use server';
    const workspaceId = String(formData.get('workspaceId') || '');
    const { session } = await requireOwner(workspaceId);
    const email = String(formData.get('email') || '')
      .trim()
      .toLowerCase();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || email.length > 191) {
      throw new Error('Invalid email address');
    }
    const existingUser = await prisma.user.findUnique({ where: { email } });
    if (existingUser) {
      const membership = await prisma.membership.findUnique({
        where: {
          userId_workspaceId: { userId: existingUser.id, workspaceId },
        },
      });
      if (membership) throw new Error('User is already a member');
    }
    const existingInvitation = await prisma.invitation.findFirst({
      where: { email, workspaceId, acceptedAt: null },
    });
    if (!existingInvitation) {
      await prisma.invitation.create({
        data: {
          email,
          token: randomUUID(),
          workspaceId,
          invitedById: session.user.id,
        },
      });
    }
    revalidatePath('/admin');
  }

  async function updateMemberRole(formData: FormData) {
    'use server';
    const workspaceId = String(formData.get('workspaceId') || '');
    const { workspace } = await requireOwner(workspaceId);
    const userId = String(formData.get('userId') || '');
    const role = String(formData.get('role') || '');
    if (!['admin', 'member'].includes(role)) throw new Error('Invalid role');
    if (userId === workspace.ownerId)
      throw new Error('Owner role cannot change');
    await prisma.membership.update({
      where: { userId_workspaceId: { userId, workspaceId } },
      data: { role },
    });
    revalidatePath('/admin');
  }

  async function removeMember(formData: FormData) {
    'use server';
    const workspaceId = String(formData.get('workspaceId') || '');
    const { workspace } = await requireOwner(workspaceId);
    const userId = String(formData.get('userId') || '');
    if (userId === workspace.ownerId)
      throw new Error('Owner cannot be removed');
    await prisma.membership.delete({
      where: { userId_workspaceId: { userId, workspaceId } },
    });
    revalidatePath('/admin');
  }

  async function revokeInvitation(formData: FormData) {
    'use server';
    const workspaceId = String(formData.get('workspaceId') || '');
    await requireOwner(workspaceId);
    const invitationId = Number(formData.get('invitationId'));
    if (!Number.isInteger(invitationId)) throw new Error('Invalid invitation');
    await prisma.invitation.deleteMany({
      where: { id: invitationId, workspaceId, acceptedAt: null },
    });
    revalidatePath('/admin');
  }

  return (
    <AdminPanel
      currentUser={{ name: session.user.name, email: session.user.email }}
      workspaces={workspaces}
      updateWorkspace={updateWorkspace}
      inviteUser={inviteUser}
      updateMemberRole={updateMemberRole}
      removeMember={removeMember}
      revokeInvitation={revokeInvitation}
    />
  );
}
