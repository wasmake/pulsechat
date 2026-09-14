'use client';

import Link from 'next/link';
import { useMemo, useState } from 'react';
import { useFormStatus } from 'react-dom';

import Avatar from './Avatar';

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

type Action = (formData: FormData) => Promise<void>;

const SubmitButton = ({ children }: { children: React.ReactNode }) => {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className="rounded-lg bg-[#6d5dfc] px-4 py-2 text-sm font-bold text-white transition hover:bg-[#7d6fff] disabled:cursor-wait disabled:opacity-50"
    >
      {pending ? 'Saving…' : children}
    </button>
  );
};

const AdminPanel = ({
  currentUser,
  workspaces,
  updateWorkspace,
  inviteUser,
  updateMemberRole,
  removeMember,
  revokeInvitation,
}: {
  currentUser: { name: string; email: string };
  workspaces: AdminWorkspace[];
  updateWorkspace: Action;
  inviteUser: Action;
  updateMemberRole: Action;
  removeMember: Action;
  revokeInvitation: Action;
}) => {
  const [activeId, setActiveId] = useState(workspaces[0].id);
  const [query, setQuery] = useState('');
  const active = workspaces.find((workspace) => workspace.id === activeId)!;
  const members = useMemo(() => {
    const normalized = query.trim().toLowerCase();
    if (!normalized) return active.members;
    return active.members.filter(
      (member) =>
        member.name.toLowerCase().includes(normalized) ||
        member.email.toLowerCase().includes(normalized)
    );
  }, [active.members, query]);
  const firstChannel = active.channels[0];

  return (
    <div className="min-h-screen bg-[#0d0f14] font-lato text-white">
      <header className="border-b border-white/10 bg-[#11131a]">
        <div className="mx-auto flex h-[72px] max-w-7xl items-center justify-between px-5 sm:px-8">
          <div>
            <p className="font-outfit text-lg font-bold">PulseChat Admin</p>
            <p className="text-xs text-[#8e95a5]">
              Signed in as {currentUser.email}
            </p>
          </div>
          <Link
            href="/"
            className="rounded-lg border border-white/10 px-4 py-2 text-sm font-bold text-[#c7cad1] transition hover:bg-white/5 hover:text-white"
          >
            Back to workspaces
          </Link>
        </div>
      </header>

      <main className="mx-auto grid max-w-7xl gap-6 px-5 py-8 sm:px-8 lg:grid-cols-[260px_minmax(0,1fr)]">
        <aside className="h-fit rounded-2xl border border-white/10 bg-[#151820] p-3">
          <p className="px-3 pb-2 pt-1 text-xs font-bold uppercase tracking-[0.14em] text-[#777f91]">
            Owned workspaces
          </p>
          <div className="space-y-1">
            {workspaces.map((workspace) => (
              <button
                key={workspace.id}
                type="button"
                onClick={() => {
                  setActiveId(workspace.id);
                  setQuery('');
                }}
                className={`flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left transition ${
                  workspace.id === activeId
                    ? 'bg-[#6d5dfc] text-white'
                    : 'text-[#b3b8c4] hover:bg-white/5 hover:text-white'
                }`}
              >
                <span
                  className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-sm font-black text-white"
                  style={{ backgroundColor: workspace.accentColor }}
                >
                  {workspace.name.slice(0, 2).toUpperCase()}
                </span>
                <span className="min-w-0">
                  <span className="block truncate text-sm font-bold">
                    {workspace.name}
                  </span>
                  <span className="block text-xs opacity-65">
                    {workspace.members.length} members
                  </span>
                </span>
              </button>
            ))}
          </div>
        </aside>

        <div className="min-w-0 space-y-6">
          <section className="rounded-2xl border border-white/10 bg-[#151820] p-5 sm:p-6">
            <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-start">
              <div>
                <p className="text-xs font-bold uppercase tracking-[0.14em] text-[#8b7fff]">
                  Workspace overview
                </p>
                <h1 className="mt-1 font-outfit text-3xl font-bold">
                  {active.name}
                </h1>
                <p className="mt-2 text-sm text-[#8e95a5]">
                  {active.members.length} members · {active.channels.length}{' '}
                  channels · {active.invitations.length} pending invites
                </p>
              </div>
              {firstChannel && (
                <Link
                  href={`/client/${active.id}/${firstChannel.id}`}
                  className="rounded-lg border border-white/10 px-4 py-2 text-center text-sm font-bold text-[#c7cad1] hover:bg-white/5 hover:text-white"
                >
                  Open workspace
                </Link>
              )}
            </div>
            <form
              action={updateWorkspace}
              className="mt-6 grid gap-3 border-t border-white/10 pt-6 sm:grid-cols-[1fr_130px_auto]"
            >
              <input type="hidden" name="workspaceId" value={active.id} />
              <label className="text-xs font-bold text-[#9ba2b2]">
                Workspace name
                <input
                  name="name"
                  defaultValue={active.name}
                  maxLength={80}
                  required
                  className="mt-2 h-10 w-full rounded-lg border border-white/10 bg-[#0d0f14] px-3 text-sm text-white outline-none focus:border-[#6d5dfc]"
                />
              </label>
              <label className="text-xs font-bold text-[#9ba2b2]">
                Accent
                <input
                  name="accentColor"
                  type="color"
                  defaultValue={active.accentColor}
                  className="mt-2 h-10 w-full cursor-pointer rounded-lg border border-white/10 bg-[#0d0f14] p-1"
                />
              </label>
              <div className="self-end">
                <SubmitButton>Save changes</SubmitButton>
              </div>
            </form>
          </section>

          <section className="rounded-2xl border border-white/10 bg-[#151820] p-5 sm:p-6">
            <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
              <div>
                <h2 className="font-outfit text-xl font-bold">People</h2>
                <p className="mt-1 text-sm text-[#8e95a5]">
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
                  className="min-w-0 flex-1 rounded-lg border border-white/10 bg-[#0d0f14] px-3 py-2 text-sm text-white outline-none placeholder:text-[#626979] focus:border-[#6d5dfc] sm:w-64"
                />
                <SubmitButton>Invite</SubmitButton>
              </form>
            </div>
            <input
              type="search"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Search members"
              className="mt-6 h-10 w-full rounded-lg border border-white/10 bg-[#0d0f14] px-3 text-sm text-white outline-none placeholder:text-[#626979] focus:border-[#6d5dfc]"
            />
            <div className="mt-4 divide-y divide-white/[0.07]">
              {members.map((member) => (
                <div
                  key={member.id}
                  className="flex flex-col gap-3 py-4 sm:flex-row sm:items-center"
                >
                  <div className="flex min-w-0 flex-1 items-center gap-3">
                    <Avatar width={40} borderRadius={10} data={member} />
                    <div className="min-w-0">
                      <p className="truncate text-sm font-bold text-[#eef0f4]">
                        {member.name}{' '}
                        {member.isOwner && (
                          <span className="ml-1 rounded bg-[#6d5dfc]/20 px-1.5 py-0.5 text-[10px] uppercase tracking-wide text-[#aaa2ff]">
                            Owner
                          </span>
                        )}
                      </p>
                      <p className="truncate text-xs text-[#7f8798]">
                        {member.email}
                      </p>
                    </div>
                  </div>
                  {!member.isOwner && (
                    <div className="flex items-center gap-2">
                      <form action={updateMemberRole} className="flex gap-2">
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
                          className="rounded-lg border border-white/10 bg-[#0d0f14] px-3 py-2 text-sm text-[#c7cad1] outline-none focus:border-[#6d5dfc]"
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
                          className="rounded-lg px-3 py-2 text-sm font-bold text-[#f07178] hover:bg-[#f07178]/10"
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
              <div className="mt-6 border-t border-white/10 pt-5">
                <h3 className="text-sm font-bold">Pending invitations</h3>
                <div className="mt-2 divide-y divide-white/[0.07]">
                  {active.invitations.map((invitation) => (
                    <div
                      key={invitation.id}
                      className="flex items-center gap-3 py-3"
                    >
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm text-[#d7d9df]">
                          {invitation.email}
                        </p>
                        <p className="text-xs text-[#747c8e]">
                          Invited{' '}
                          {new Date(invitation.createdAt).toLocaleDateString()}
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
                          className="rounded-lg px-3 py-2 text-xs font-bold text-[#f07178] hover:bg-[#f07178]/10"
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
      </main>
    </div>
  );
};

export default AdminPanel;
