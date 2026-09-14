'use server';

import { randomUUID } from 'crypto';
import { headers } from 'next/headers';
import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';

import { isSuperAdmin } from '@/lib/admin';
import { auth } from '@/lib/auth';
import prisma from '@/lib/prisma';

const requireSuperAdmin = async () => {
  const session = await auth.api.getSession({ headers: headers() });
  if (!session) redirect('/sign-in');
  if (!isSuperAdmin(session.user)) throw new Error('Access denied');
  return session;
};

const requireWorkspace = async (workspaceId: string) => {
  const workspace = await prisma.workspace.findUnique({
    where: { id: workspaceId },
    select: { id: true, ownerId: true },
  });
  if (!workspace) throw new Error('Workspace not found');
  return workspace;
};

export async function updateWorkspace(formData: FormData) {
  await requireSuperAdmin();
  const workspaceId = String(formData.get('workspaceId') || '');
  await requireWorkspace(workspaceId);
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

export async function inviteUser(formData: FormData) {
  const session = await requireSuperAdmin();
  const workspaceId = String(formData.get('workspaceId') || '');
  await requireWorkspace(workspaceId);
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

export async function updateMemberRole(formData: FormData) {
  await requireSuperAdmin();
  const workspaceId = String(formData.get('workspaceId') || '');
  const workspace = await requireWorkspace(workspaceId);
  const userId = String(formData.get('userId') || '');
  const role = String(formData.get('role') || '');
  if (!['admin', 'member'].includes(role)) throw new Error('Invalid role');
  if (userId === workspace.ownerId) throw new Error('Owner role cannot change');
  const workspaceRole = await prisma.workspaceRole.findFirst({
    where: {
      workspaceId,
      isManaged: true,
      name: role === 'admin' ? 'Admin' : 'Member',
    },
    select: { id: true },
  });
  await prisma.membership.update({
    where: { userId_workspaceId: { userId, workspaceId } },
    data: { role, roleId: workspaceRole?.id || null },
  });
  revalidatePath('/admin');
}

export async function removeMember(formData: FormData) {
  await requireSuperAdmin();
  const workspaceId = String(formData.get('workspaceId') || '');
  const workspace = await requireWorkspace(workspaceId);
  const userId = String(formData.get('userId') || '');
  if (userId === workspace.ownerId) throw new Error('Owner cannot be removed');
  await prisma.membership.delete({
    where: { userId_workspaceId: { userId, workspaceId } },
  });
  revalidatePath('/admin');
}

export async function revokeInvitation(formData: FormData) {
  await requireSuperAdmin();
  const workspaceId = String(formData.get('workspaceId') || '');
  await requireWorkspace(workspaceId);
  const invitationId = Number(formData.get('invitationId'));
  if (!Number.isInteger(invitationId)) throw new Error('Invalid invitation');
  await prisma.invitation.deleteMany({
    where: { id: invitationId, workspaceId, acceptedAt: null },
  });
  revalidatePath('/admin');
}
