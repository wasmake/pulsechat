'use server';

import { headers } from 'next/headers';
import { redirect } from 'next/navigation';
import { Prisma } from '@prisma/client';

import { auth } from '@/lib/auth';
import prisma from '@/lib/prisma';

export async function claimWorkspaceInvite(formData: FormData) {
  const session = await auth.api.getSession({ headers: headers() });
  const token = String(formData.get('token') || '');
  if (!session)
    redirect(`/sign-in?callbackURL=${encodeURIComponent(`/invite/${token}`)}`);

  const destination = await prisma.$transaction(
    async (tx) => {
      const invite = await tx.workspaceInviteLink.findUnique({
        where: { token },
        include: {
          workspace: {
            include: { channels: { take: 1, orderBy: { id: 'asc' } } },
          },
        },
      });
      if (!invite || invite.revokedAt)
        throw new Error('This invite is no longer available');
      if (invite.expiresAt && invite.expiresAt <= new Date())
        throw new Error('This invite has expired');

      const existing = await tx.membership.findUnique({
        where: {
          userId_workspaceId: {
            userId: session.user.id,
            workspaceId: invite.workspaceId,
          },
        },
      });
      if (!existing) {
        if (invite.maxUses !== null && invite.useCount >= invite.maxUses) {
          throw new Error('This invite has reached its claim limit');
        }
        const fallbackRole = invite.roleId
          ? null
          : await tx.workspaceRole.findFirst({
              where: { workspaceId: invite.workspaceId, isDefault: true },
            });
        await tx.membership.create({
          data: {
            userId: session.user.id,
            email: session.user.email.toLowerCase(),
            workspaceId: invite.workspaceId,
            role: 'member',
            roleId: invite.roleId || fallbackRole?.id || null,
          },
        });
        await tx.workspaceInviteLink.update({
          where: { id: invite.id },
          data: { useCount: { increment: 1 } },
        });
      }
      return `/client/${invite.workspaceId}/${invite.workspace.channels[0]?.id || ''}`;
    },
    { isolationLevel: Prisma.TransactionIsolationLevel.Serializable }
  );

  redirect(destination);
}
