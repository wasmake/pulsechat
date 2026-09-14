'use client';

import Link from 'next/link';
import { useMemo, useState } from 'react';
import { useFormStatus } from 'react-dom';

import Avatar from './Avatar';
import Navbar from './Navbar';
import {
  inviteUser,
  removeMember,
  revokeInvitation,
  updateMemberRole,
  updateWorkspace,
} from '@/app/admin/actions';

export type AdminWorkspace = {
  id: string;
  name: string;
  image: string | null;
  accentColor: string;
  channels: { id: string; name: string }[];
  invitations: { id: number; email: string; createdAt: string }[];
  members: {
    id: string;
    userId: string;
    name: string;
    email: string;
    image: string | null;
    role: string;
    joinedAt: string | null;
    isOwner: boolean;
  }[];
};

const SubmitButton = ({ children }: { children: React.ReactNode }) => {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className="rounded-md bg-[#fafafa] px-3 py-2 text-sm font-medium text-[#18181b] transition-colors hover:bg-[#e4e4e7] disabled:cursor-wait disabled:opacity-50"
    >
      {pending ? 'Saving…' : children}
    </button>
  );
};

const AdminPanel = ({
  currentUser,
  workspaces,
}: {
  currentUser: { name: string; email: string };
  workspaces: AdminWorkspace[];
}) => {
  const [activeId, setActiveId] = useState(workspaces[0]?.id || '');
  const [query, setQuery] = useState('');
  const active = workspaces.find((workspace) => workspace.id === activeId);
  const members = useMemo(() => {
    if (!active) return [];
    const normalized = query.trim().toLowerCase();
    if (!normalized) return active.members;
    return active.members.filter(
      (member) =>
        member.name.toLowerCase().includes(normalized) ||
        member.email.toLowerCase().includes(normalized)
    );
  }, [active, query]);
  const firstChannel = active?.channels[0];

  return (
    <div className="min-h-screen bg-[#09090b] font-lato text-[#fafafa]">
      <Navbar />

      <main className="mx-auto max-w-5xl px-5 py-8 sm:px-6 sm:py-12">
        <div className="mb-7 flex items-start justify-between gap-4">
          <div>
            <h1 className="font-outfit text-2xl font-semibold tracking-tight">
              Administration
            </h1>
            <p className="mt-1.5 text-sm text-[#a1a1aa]">
              Signed in as {currentUser.email}
            </p>
          </div>
          <Link
            href="/"
            className="shrink-0 rounded-md border border-[#3f3f46] bg-[#18181b] px-3 py-2 text-sm font-medium text-[#e4e4e7] transition-colors hover:bg-[#27272a]"
          >
            Back to workspaces
          </Link>
        </div>

        <div className="grid items-start gap-6 lg:grid-cols-[240px_minmax(0,1fr)]">
          <aside className="h-fit overflow-hidden rounded-xl border border-[#27272a] bg-[#0f0f12]">
            <div className="flex items-center justify-between border-b border-[#27272a] px-4 py-3.5">
              <h2 className="text-sm font-medium">All workspaces</h2>
              <span className="rounded-md bg-[#27272a] px-2 py-0.5 text-xs tabular-nums text-[#a1a1aa]">
                {workspaces.length}
              </span>
            </div>
            <div className="space-y-1 p-2">
              {workspaces.map((workspace) => (
                <button
                  key={workspace.id}
                  type="button"
                  onClick={() => {
                    setActiveId(workspace.id);
                    setQuery('');
                  }}
                  className={`flex w-full items-center gap-3 rounded-md px-2 py-2 text-left transition-colors ${
                    workspace.id === activeId
                      ? 'bg-[#27272a] text-[#fafafa]'
                      : 'text-[#a1a1aa] hover:bg-[#18181b] hover:text-[#fafafa]'
                  }`}
                >
                  {workspace.image ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={workspace.image}
                      alt=""
                      className="h-9 w-9 shrink-0 rounded-lg border border-[#27272a] object-cover"
                    />
                  ) : (
                    <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-[#3f3f46] bg-[#27272a] font-outfit text-xs font-semibold text-[#e4e4e7]">
                      {workspace.name.slice(0, 2).toUpperCase()}
                    </span>
                  )}
                  <span className="min-w-0">
                    <span className="block truncate text-sm font-medium">
                      {workspace.name}
                    </span>
                    <span className="block text-xs text-[#71717a]">
                      {workspace.members.length} member
                      {workspace.members.length !== 1 && 's'}
                    </span>
                  </span>
                </button>
              ))}
            </div>
          </aside>

          {active ? (
            <div className="min-w-0 space-y-6">
              <section className="rounded-xl border border-[#27272a] bg-[#0f0f12] p-4 sm:p-5">
                <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-start">
                  <div>
                    <p className="text-xs font-medium text-[#71717a]">
                      Workspace overview
                    </p>
                    <h2 className="mt-1 font-outfit text-xl font-semibold tracking-tight">
                      {active.name}
                    </h2>
                    <p className="mt-1.5 text-xs text-[#71717a]">
                      {active.members.length} members · {active.channels.length}{' '}
                      channels · {active.invitations.length} pending invites
                    </p>
                  </div>
                  {firstChannel && (
                    <Link
                      href={`/client/${active.id}/${firstChannel.id}`}
                      className="rounded-md border border-[#3f3f46] bg-[#18181b] px-3 py-2 text-center text-sm font-medium text-[#e4e4e7] transition-colors hover:bg-[#27272a]"
                    >
                      Open workspace
                    </Link>
                  )}
                </div>
                <form
                  action={updateWorkspace}
                  className="mt-5 grid gap-3 border-t border-[#27272a] pt-5 sm:grid-cols-[1fr_110px_auto]"
                >
                  <input type="hidden" name="workspaceId" value={active.id} />
                  <label className="text-xs font-medium text-[#a1a1aa]">
                    Workspace name
                    <input
                      name="name"
                      defaultValue={active.name}
                      maxLength={80}
                      required
                      className="mt-2 h-10 w-full rounded-md border border-[#3f3f46] bg-[#09090b] px-3 text-sm text-[#fafafa] outline-none transition-colors focus:border-[#71717a]"
                    />
                  </label>
                  <label className="text-xs font-medium text-[#a1a1aa]">
                    Accent
                    <input
                      name="accentColor"
                      type="color"
                      defaultValue={active.accentColor}
                      className="mt-2 h-10 w-full cursor-pointer rounded-md border border-[#3f3f46] bg-[#09090b] p-1"
                    />
                  </label>
                  <div className="self-end">
                    <SubmitButton>Save changes</SubmitButton>
                  </div>
                </form>
              </section>

              <section className="rounded-xl border border-[#27272a] bg-[#0f0f12] p-4 sm:p-5">
                <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
                  <div>
                    <h2 className="font-outfit text-lg font-semibold">
                      People
                    </h2>
                    <p className="mt-1 text-sm text-[#71717a]">
                      Invite teammates and control workspace access.
                    </p>
                  </div>
                  <form action={inviteUser} className="flex gap-2">
                    <input type="hidden" name="workspaceId" value={active.id} />
                    <input
                      name="email"
                      type="email"
                      required
                      placeholder="teammate@example.com"
                      className="min-w-0 flex-1 rounded-md border border-[#3f3f46] bg-[#09090b] px-3 py-2 text-sm text-[#fafafa] outline-none placeholder:text-[#52525b] focus:border-[#71717a] sm:w-56"
                    />
                    <SubmitButton>Invite</SubmitButton>
                  </form>
                </div>
                <input
                  type="search"
                  value={query}
                  onChange={(event) => setQuery(event.target.value)}
                  placeholder="Search members"
                  className="mt-5 h-10 w-full rounded-md border border-[#3f3f46] bg-[#09090b] px-3 text-sm text-[#fafafa] outline-none placeholder:text-[#52525b] focus:border-[#71717a]"
                />
                <div className="mt-3 divide-y divide-[#27272a]">
                  {members.map((member) => (
                    <div
                      key={member.id}
                      className="flex flex-col gap-3 py-4 sm:flex-row sm:items-center"
                    >
                      <div className="flex min-w-0 flex-1 items-center gap-3">
                        <Avatar width={40} borderRadius={10} data={member} />
                        <div className="min-w-0">
                          <p className="truncate text-sm font-medium text-[#e4e4e7]">
                            {member.name}{' '}
                            {member.isOwner && (
                              <span className="ml-1 rounded bg-[#27272a] px-1.5 py-0.5 text-[10px] uppercase tracking-wide text-[#a1a1aa]">
                                Owner
                              </span>
                            )}
                          </p>
                          <p className="truncate text-xs text-[#71717a]">
                            {member.email}
                          </p>
                        </div>
                      </div>
                      {!member.isOwner && (
                        <div className="flex flex-wrap items-center gap-2">
                          <form
                            action={updateMemberRole}
                            className="flex gap-2"
                          >
                            <input
                              type="hidden"
                              name="workspaceId"
                              value={active.id}
                            />
                            <input
                              type="hidden"
                              name="userId"
                              value={member.userId}
                            />
                            <select
                              name="role"
                              defaultValue={
                                member.role === 'admin' ? 'admin' : 'member'
                              }
                              className="rounded-md border border-[#3f3f46] bg-[#09090b] px-3 py-2 text-sm text-[#d4d4d8] outline-none focus:border-[#71717a]"
                            >
                              <option value="member">Member</option>
                              <option value="admin">Admin</option>
                            </select>
                            <SubmitButton>Update</SubmitButton>
                          </form>
                          <form action={removeMember}>
                            <input
                              type="hidden"
                              name="workspaceId"
                              value={active.id}
                            />
                            <input
                              type="hidden"
                              name="userId"
                              value={member.userId}
                            />
                            <button
                              type="submit"
                              onClick={(event) => {
                                if (
                                  !confirm(
                                    `Remove ${member.name} from ${active.name}?`
                                  )
                                ) {
                                  event.preventDefault();
                                }
                              }}
                              className="rounded-md px-3 py-2 text-sm font-medium text-[#f87171] transition-colors hover:bg-red-950/40"
                            >
                              Remove
                            </button>
                          </form>
                        </div>
                      )}
                    </div>
                  ))}
                </div>

                {active.invitations.length > 0 && (
                  <div className="mt-5 border-t border-[#27272a] pt-5">
                    <h3 className="text-sm font-medium">Pending invitations</h3>
                    <div className="mt-2 divide-y divide-[#27272a]">
                      {active.invitations.map((invitation) => (
                        <div
                          key={invitation.id}
                          className="flex items-center gap-3 py-3"
                        >
                          <div className="min-w-0 flex-1">
                            <p className="truncate text-sm text-[#d4d4d8]">
                              {invitation.email}
                            </p>
                            <p className="text-xs text-[#71717a]">
                              Invited{' '}
                              {new Date(
                                invitation.createdAt
                              ).toLocaleDateString()}
                            </p>
                          </div>
                          <form action={revokeInvitation}>
                            <input
                              type="hidden"
                              name="workspaceId"
                              value={active.id}
                            />
                            <input
                              type="hidden"
                              name="invitationId"
                              value={invitation.id}
                            />
                            <button
                              type="submit"
                              className="rounded-md px-3 py-2 text-xs font-medium text-[#f87171] transition-colors hover:bg-red-950/40"
                            >
                              Revoke
                            </button>
                          </form>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </section>
            </div>
          ) : (
            <div className="rounded-xl border border-dashed border-[#3f3f46] bg-[#0f0f12] px-6 py-12 text-center">
              <p className="text-sm font-medium">No workspaces yet</p>
              <p className="mt-1 text-sm text-[#71717a]">
                Create a workspace from the main portal to manage it here.
              </p>
            </div>
          )}
        </div>
      </main>
    </div>
  );
};

export default AdminPanel;
