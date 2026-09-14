import { headers } from 'next/headers';
import Link from 'next/link';
import { redirect } from 'next/navigation';

import Navbar from '@/components/Navbar';
import prisma from '@/lib/prisma';
import { auth } from '@/lib/auth';
import SignOutButton from '@/components/SignOutButton';
import WorkspaceList from '@/components/WorkspaceList';
import { isSuperAdmin } from '@/lib/admin';
import { syncDomainMemberships } from '@/lib/workspace-access';

export default async function Home() {
  const session = await auth.api.getSession({ headers: headers() });
  if (!session) redirect('/sign-in');

  const { user } = session;
  const userEmail = user.email;

  await syncDomainMemberships({ id: user.id, email: userEmail });

  const memberships = await prisma.membership.findMany({
    where: {
      userId: user.id,
    },
    include: {
      workspace: {
        include: {
          _count: {
            select: { memberships: true },
          },
          memberships: {
            take: 5,
          },
          channels: {
            take: 1,
            select: {
              id: true,
            },
          },
        },
      },
    },
  });

  const workspaces = memberships.map((membership) => {
    const { workspace } = membership;
    return {
      id: workspace.id,
      name: workspace.name,
      image: workspace.image,
      memberCount: workspace._count.memberships,
      firstChannelId: workspace.channels[0].id,
    };
  });
  const canAccessAdmin = isSuperAdmin(user);

  const invitations = await prisma.invitation.findMany({
    where: {
      email: userEmail,
      acceptedAt: null,
    },
    include: {
      workspace: {
        include: {
          _count: {
            select: { memberships: true },
          },
          memberships: {
            take: 5,
          },
        },
      },
    },
  });

  const processedInvitations = invitations.map((invitation) => {
    const { workspace } = invitation;
    return {
      id: workspace.id,
      name: workspace.name,
      image: workspace.image,
      memberCount: workspace._count.memberships,
      token: invitation.token,
    };
  });

  async function acceptInvitation(formData: FormData) {
    'use server';
    const token = String(formData.get('token'));
    const invitation = await prisma.invitation.findUnique({
      where: { token },
    });

    if (
      !invitation ||
      invitation.acceptedAt ||
      invitation.email.toLowerCase() !== userEmail.toLowerCase()
    ) {
      throw new Error('Invitation is invalid or belongs to another user');
    }

    const defaultRole = await prisma.workspaceRole.findFirst({
      where: { workspaceId: invitation.workspaceId, isDefault: true },
      select: { id: true },
    });

    await prisma.$transaction([
      prisma.membership.create({
        data: {
          userId: user.id,
          email: userEmail,
          workspaceId: invitation.workspaceId,
          role: 'user',
          roleId: defaultRole?.id,
        },
      }),
      prisma.invitation.update({
        where: { token },
        data: {
          acceptedAt: new Date(),
          acceptedById: user.id,
        },
      }),
    ]);

    const workspace = await prisma.workspace.findUnique({
      where: { id: invitation.workspaceId },
      select: {
        id: true,
        channels: {
          take: 1,
          select: {
            id: true,
          },
        },
      },
    });

    redirect(`/client/${workspace!.id}/${workspace!.channels[0].id}`);
  }

  async function launchChat(formData: FormData) {
    'use server';
    const workspaceId = formData.get('workspaceId');
    const channelId = formData.get('channelId');
    redirect(`/client/${workspaceId}/${channelId}`);
  }

  async function goToGetStartedPage() {
    'use server';
    redirect('/get-started');
  }

  return (
    <div className="min-h-screen bg-[#09090b] font-lato text-[#fafafa]">
      <Navbar />
      <main className="mx-auto max-w-5xl px-5 py-8 sm:px-6 sm:py-12">
        <div className="mb-7">
          <h1 className="font-outfit text-2xl font-semibold tracking-tight">
            Choose a workspace
          </h1>
          <p className="mt-1.5 text-sm text-[#a1a1aa]">
            Signed in as {userEmail}
          </p>
        </div>

        <div className="grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_280px]">
          <div className="space-y-6">
            {workspaces.length > 0 ? (
              <WorkspaceList
                title="Your workspaces"
                workspaces={workspaces}
                action={launchChat}
                actionText="Open"
              />
            ) : (
              <div className="rounded-xl border border-dashed border-[#3f3f46] bg-[#0f0f12] px-6 py-12 text-center">
                <p className="text-sm font-medium">No workspaces yet</p>
                <p className="mt-1 text-sm text-[#71717a]">
                  Create a workspace to start chatting with your team.
                </p>
              </div>
            )}

            {processedInvitations.length > 0 && (
              <WorkspaceList
                title="Pending invitations"
                workspaces={processedInvitations}
                action={acceptInvitation}
                actionText="Accept"
                buttonVariant="secondary"
              />
            )}
          </div>

          <aside className="space-y-4">
            <section className="rounded-xl border border-[#27272a] bg-[#0f0f12] p-4">
              <div className="flex h-9 w-9 items-center justify-center rounded-lg border border-[#3f3f46] bg-[#18181b] text-lg text-[#d4d4d8]">
                +
              </div>
              <h2 className="mt-4 text-sm font-medium">Create a workspace</h2>
              <p className="mt-1 text-xs leading-5 text-[#71717a]">
                Start a new space for another team or project.
              </p>
              <div className="mt-4">
                <form action={goToGetStartedPage}>
                  <button
                    type="submit"
                    className="w-full rounded-md border border-[#3f3f46] bg-[#18181b] px-3 py-2 text-sm font-medium text-[#e4e4e7] transition-colors hover:bg-[#27272a]"
                  >
                    New workspace
                  </button>
                </form>
              </div>
            </section>

            {canAccessAdmin && (
              <Link
                href="/admin"
                className="block rounded-xl border border-[#27272a] bg-[#0f0f12] p-4 transition-colors hover:bg-[#18181b]"
              >
                <div className="flex items-center justify-between">
                  <h2 className="text-sm font-medium text-[#fafafa]">
                    Administration
                  </h2>
                  <span className="text-[#71717a]" aria-hidden="true">
                    →
                  </span>
                </div>
                <p className="mt-1 text-xs leading-5 text-[#71717a]">
                  Manage workspaces, members, and invitations.
                </p>
              </Link>
            )}

            <section className="rounded-xl border border-[#27272a] bg-[#0f0f12] p-4">
              <p className="truncate text-sm font-medium text-[#e4e4e7]">
                {user.name}
              </p>
              <p className="mt-0.5 truncate text-xs text-[#71717a]">
                {userEmail}
              </p>
              <SignOutButton className="mt-4 w-full rounded-md px-3 py-2 text-left text-sm font-medium text-[#a1a1aa] transition-colors hover:bg-[#27272a] hover:text-[#fafafa]">
                Sign out
              </SignOutButton>
            </section>
          </aside>
        </div>
      </main>
    </div>
  );
}
