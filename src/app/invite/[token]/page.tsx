import { headers } from 'next/headers';
import Link from 'next/link';
import { notFound, redirect } from 'next/navigation';

import Navbar from '@/components/Navbar';
import { auth } from '@/lib/auth';
import prisma from '@/lib/prisma';
import { claimWorkspaceInvite } from './actions';

export default async function InvitePage({
  params,
}: {
  params: { token: string };
}) {
  const session = await auth.api.getSession({ headers: headers() });
  if (!session)
    redirect(
      `/sign-in?callbackURL=${encodeURIComponent(`/invite/${params.token}`)}`
    );

  const invite = await prisma.workspaceInviteLink.findUnique({
    where: { token: params.token },
    include: { workspace: { select: { id: true, name: true, image: true } } },
  });
  if (!invite) notFound();
  const expired = Boolean(invite.expiresAt && invite.expiresAt <= new Date());
  const exhausted =
    invite.maxUses !== null && invite.useCount >= invite.maxUses;
  const unavailable = Boolean(invite.revokedAt) || expired || exhausted;
  const membership = await prisma.membership.findUnique({
    where: {
      userId_workspaceId: {
        userId: session.user.id,
        workspaceId: invite.workspaceId,
      },
    },
  });

  return (
    <div className="min-h-screen bg-[#09090b] font-lato text-[#fafafa]">
      <Navbar />
      <main className="mx-auto flex max-w-5xl justify-center px-5 py-16 sm:px-6">
        <section className="w-full max-w-md rounded-xl border border-[#27272a] bg-[#0f0f12] p-6 text-center">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-xl border border-[#3f3f46] bg-[#27272a] font-outfit text-lg font-semibold">
            {invite.workspace.name.slice(0, 2).toUpperCase()}
          </div>
          <p className="mt-5 text-sm text-[#a1a1aa]">
            You have been invited to join
          </p>
          <h1 className="mt-1 font-outfit text-2xl font-semibold">
            {invite.workspace.name}
          </h1>
          <p className="mt-2 text-sm text-[#71717a]">
            Signed in as {session.user.email}
          </p>
          {unavailable ? (
            <div className="mt-6">
              <p className="rounded-md bg-red-950/40 px-3 py-2 text-sm text-[#fca5a5]">
                This invitation is expired, revoked, or has reached its claim
                limit.
              </p>
              <Link
                href="/"
                className="mt-4 inline-block text-sm text-[#d4d4d8] hover:text-white"
              >
                Return to workspaces
              </Link>
            </div>
          ) : membership ? (
            <Link
              href={`/client/${invite.workspaceId}`}
              className="mt-6 inline-flex rounded-md bg-[#fafafa] px-4 py-2 text-sm font-medium text-[#18181b] hover:bg-[#e4e4e7]"
            >
              Open workspace
            </Link>
          ) : (
            <form action={claimWorkspaceInvite} className="mt-6">
              <input type="hidden" name="token" value={invite.token} />
              <button className="w-full rounded-md bg-[#fafafa] px-4 py-2 text-sm font-medium text-[#18181b] hover:bg-[#e4e4e7]">
                Join workspace
              </button>
            </form>
          )}
        </section>
      </main>
    </div>
  );
}
