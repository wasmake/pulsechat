interface WorkspaceListProps {
  action: (formData: FormData) => void;
  actionText: string;
  buttonVariant?: 'primary' | 'secondary';
  title: string;
  workspaces: {
    id: string;
    name: string;
    image: string | null;
    memberCount: number;
    token?: string;
    firstChannelId?: string;
  }[];
}

const WorkspaceList = ({
  action,
  actionText,
  buttonVariant = 'primary',
  title,
  workspaces,
}: WorkspaceListProps) => (
  <section className="overflow-hidden rounded-2xl border border-white/10 bg-[#151820] shadow-[0_24px_80px_rgba(0,0,0,0.24)]">
    <div className="border-b border-white/10 px-5 py-4 sm:px-6">
      <h2 className="text-sm font-bold text-[#f0f1f5]">{title}</h2>
    </div>
    <div className="divide-y divide-white/[0.07]">
      {workspaces.map((workspace) => (
        <form
          action={action}
          key={workspace.id}
          className="group flex flex-col gap-4 px-5 py-5 transition hover:bg-white/[0.035] sm:flex-row sm:items-center sm:px-6"
        >
          <input
            type="hidden"
            name="channelId"
            value={workspace.firstChannelId}
          />
          <input type="hidden" name="token" value={workspace.token} />
          <input type="hidden" name="workspaceId" value={workspace.id} />
          <div className="flex min-w-0 flex-1 items-center gap-4">
            {workspace.image ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={workspace.image}
                alt=""
                className="h-14 w-14 shrink-0 rounded-xl border border-white/10 object-cover"
              />
            ) : (
              <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-xl border border-[#8075ff]/30 bg-gradient-to-br from-[#6d5dfc] to-[#3d2fa7] font-outfit text-xl font-bold text-white shadow-[0_8px_24px_#6d5dfc33]">
                {workspace.name.slice(0, 2).toUpperCase()}
              </div>
            )}
            <div className="min-w-0">
              <h3 className="truncate font-outfit text-lg font-bold text-white">
                {workspace.name}
              </h3>
              <p className="mt-1 text-sm text-[#8e95a5]">
                {workspace.memberCount} member
                {workspace.memberCount !== 1 && 's'}
              </p>
            </div>
          </div>
          <button
            type="submit"
            className={
              buttonVariant === 'secondary'
                ? 'w-full rounded-lg border border-[#6d5dfc]/60 px-5 py-2.5 text-sm font-bold text-[#b8b1ff] transition hover:bg-[#6d5dfc]/15 sm:w-auto'
                : 'w-full rounded-lg bg-[#6d5dfc] px-5 py-2.5 text-sm font-bold text-white shadow-[0_8px_24px_#6d5dfc33] transition hover:bg-[#7d6fff] sm:w-auto'
            }
          >
            {actionText}
          </button>
        </form>
      ))}
    </div>
  </section>
);

export default WorkspaceList;
