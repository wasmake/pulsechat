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
  <section className="overflow-hidden rounded-xl border border-[#27272a] bg-[#0f0f12]">
    <div className="flex items-center justify-between border-b border-[#27272a] px-4 py-3.5">
      <h2 className="text-sm font-medium text-[#fafafa]">{title}</h2>
      <span className="rounded-md bg-[#27272a] px-2 py-0.5 text-xs tabular-nums text-[#a1a1aa]">
        {workspaces.length}
      </span>
    </div>
    <div className="divide-y divide-[#27272a]">
      {workspaces.map((workspace) => (
        <form
          action={action}
          key={workspace.id}
          className="group flex items-center gap-3 px-4 py-3.5 transition-colors hover:bg-[#18181b]"
        >
          <input
            type="hidden"
            name="channelId"
            value={workspace.firstChannelId}
          />
          <input type="hidden" name="token" value={workspace.token} />
          <input type="hidden" name="workspaceId" value={workspace.id} />
          {workspace.image ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={workspace.image}
              alt=""
              className="h-10 w-10 shrink-0 rounded-lg border border-[#27272a] object-cover"
            />
          ) : (
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border border-[#3f3f46] bg-[#27272a] font-outfit text-sm font-semibold text-[#e4e4e7]">
              {workspace.name.slice(0, 2).toUpperCase()}
            </div>
          )}
          <div className="min-w-0 flex-1">
            <h3 className="truncate text-sm font-medium text-[#fafafa]">
              {workspace.name}
            </h3>
            <p className="mt-0.5 text-xs text-[#71717a]">
              {workspace.memberCount} member
              {workspace.memberCount !== 1 && 's'}
            </p>
          </div>
          <button
            type="submit"
            className={
              buttonVariant === 'secondary'
                ? 'shrink-0 rounded-md border border-[#3f3f46] bg-transparent px-3 py-1.5 text-xs font-medium text-[#e4e4e7] transition-colors hover:bg-[#27272a]'
                : 'shrink-0 rounded-md bg-[#fafafa] px-3 py-1.5 text-xs font-medium text-[#18181b] transition-colors hover:bg-[#e4e4e7]'
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
