import { headers } from 'next/headers';
import { redirect } from 'next/navigation';

import Navbar from '@/components/Navbar';
import prisma from '@/lib/prisma';
import { auth } from '@/lib/auth';
import SignOutButton from '@/components/SignOutButton';
import WorkspaceList from '@/components/WorkspaceList';

export default async function Home() {
  const session = await auth.api.getSession({ headers: headers() });
  if (!session) redirect('/sign-in');

  const { user } = session;
  const userEmail = user.email;

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

    await prisma.$transaction([
      prisma.membership.create({
        data: {
          userId: user.id,
          email: userEmail,
          workspaceId: invitation.workspaceId,
          role: 'user',
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
    <div className="relative min-h-screen overflow-hidden bg-[#0d0f14] font-lato text-white">
      <div className="pointer-events-none absolute left-[-12rem] top-20 h-[30rem] w-[30rem] rounded-full bg-[#6d5dfc]/10 blur-[100px]" />
      <div className="pointer-events-none absolute right-[-10rem] top-[28rem] h-[24rem] w-[24rem] rounded-full bg-[#24b7a5]/[0.07] blur-[100px]" />
      <Navbar action={goToGetStartedPage} />
      <main className="relative mx-auto max-w-6xl px-5 pb-16 pt-12 sm:px-8 sm:pt-16">
        <div className="mb-10 max-w-2xl">
          <div className="mb-5 inline-flex items-center gap-2 rounded-full border border-[#6d5dfc]/30 bg-[#6d5dfc]/10 px-3 py-1.5 text-xs font-bold uppercase tracking-[0.16em] text-[#aaa2ff]">
            <span className="h-1.5 w-1.5 rounded-full bg-[#8b7fff] shadow-[0_0_10px_#8b7fff]" />
            Workspace hub
          </div>
          <h1 className="font-outfit text-4xl font-semibold leading-tight tracking-[-0.03em] sm:text-6xl">
            Pick up where your
            <span className="block text-[#8b7fff]">team left off.</span>
          </h1>
          <p className="mt-5 max-w-xl text-base leading-7 text-[#9ba2b2]">
            Choose a workspace to open your conversations, or start a new home
            for your team.
          </p>
        </div>
        <div className="mb-8">
          {workspaces.length > 0 ? (
            <WorkspaceList
              title={`Workspaces for ${userEmail}`}
              workspaces={workspaces}
              action={launchChat}
              actionText="Open workspace"
            />
          ) : (
            <div className="rounded-2xl border border-dashed border-white/15 bg-white/[0.025] px-6 py-12 text-center">
              <p className="font-outfit text-xl font-bold">No workspaces yet</p>
              <p className="mt-2 text-sm text-[#8e95a5]">
                Create one below to start chatting with your team.
              </p>
            </div>
          )}
        </div>
        <section className="mb-8 grid overflow-hidden rounded-2xl border border-white/10 bg-gradient-to-r from-[#1d2030] to-[#171923] p-6 sm:grid-cols-[1fr_auto] sm:items-center sm:p-8">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.16em] text-[#8277ff]">
              Build a new space
            </p>
            <h2 className="mt-2 font-outfit text-2xl font-bold">
              Bring another team to PulseChat
            </h2>
            <p className="mt-2 max-w-xl text-sm leading-6 text-[#9ba2b2]">
              Create channels, invite teammates, and keep every conversation in
              one focused place.
            </p>
          </div>
          <div className="mt-5 sm:ml-8 sm:mt-0">
            <form action={goToGetStartedPage}>
              <button
                type="submit"
                className="w-full rounded-lg bg-white px-5 py-3 text-sm font-bold text-[#14161d] transition hover:bg-[#e8e9ed] sm:w-auto"
              >
                Create a new workspace
              </button>
            </form>
          </div>
        </section>
        <div className="mb-10">
          {processedInvitations.length > 0 && (
            <WorkspaceList
              title={`Invitations for ${userEmail}`}
              workspaces={processedInvitations}
              action={acceptInvitation}
              actionText="Accept invite"
              buttonVariant="secondary"
            />
          )}
        </div>
        <SignOutButton className="mx-auto flex flex-col items-center justify-center rounded-lg px-4 py-2 text-[#9ba2b2] transition hover:bg-white/5 sm:flex-row">
          <p className="text-sm sm:mr-2">Not seeing your workspace?</p>
          <span className="ml-2 flex items-center gap-2 text-sm font-bold text-[#aaa2ff]">
            <span>Try using a different email</span>
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="w-[19px] h-[13px]"
              fill="none"
            >
              <path
                d="M1 6a.5.5 0 0 0 0 1V6zM12.854.646a.5.5 0 0 0-.708.708l.708-.708zM18 6.5l.354.354a.5.5 0 0 0 0-.708L18 6.5zm-5.854 5.146a.5.5 0 0 0 .708.708l-.708-.708zM1 7h16.5V6H1v1zm16.646-.854l-5.5 5.5.708.708 5.5-5.5-.708-.708zm-5.5-4.792l2.75 2.75.708-.708-2.75-2.75-.708.708zm2.75 2.75l2.75 2.75.708-.708-2.75-2.75-.708.708z"
                fill="currentColor"
              />
            </svg>
          </span>
        </SignOutButton>
      </main>
    </div>
  );
}
