import { headers } from 'next/headers';
import { notFound, redirect } from 'next/navigation';

import AdminPanel, { AdminWorkspace } from '@/components/AdminPanel';
import { isSuperAdmin } from '@/lib/admin';
import { auth } from '@/lib/auth';
import prisma from '@/lib/prisma';
import {
  inviteUser,
  removeMember,
  revokeInvitation,
  updateMemberRole,
  updateWorkspace,
} from './actions';

const getSession = () => auth.api.getSession({ headers: headers() });

export default async function AdminPage() {
  const session = await getSession();
  if (!session) redirect('/sign-in');
  if (!isSuperAdmin(session.user)) notFound();

  const allWorkspaces = await prisma.workspace.findMany({
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

  const userIds = Array.from(
    new Set(
      allWorkspaces.flatMap((workspace) =>
        workspace.memberships.map((membership) => membership.userId)
      )
    )
  );
  const users = await prisma.user.findMany({
    where: { id: { in: userIds } },
    select: { id: true, name: true, email: true, image: true },
  });
  const usersById = new Map(users.map((user) => [user.id, user]));

  const workspaces: AdminWorkspace[] = allWorkspaces.map((workspace) => ({
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
