'use client';

import { useRouter } from 'next/navigation';

import type { ProfileUser } from '@/app/client/layout';
import Avatar from './Avatar';
import Close from './icons/Close';
import Messages from './icons/Messages';

const ProfileView = ({
  user,
  currentUserId,
  workspaceId,
  onClose,
  onEdit,
}: {
  user: ProfileUser | null;
  currentUserId: string;
  workspaceId?: string;
  onClose: () => void;
  onEdit: () => void;
}) => {
  const router = useRouter();
  if (!user) return null;
  const isCurrentUser = user.id === currentUserId;
  const statusLabel =
    user.online === true
      ? 'Active'
      : user.online === false
        ? user.lastActive
          ? `Last active ${new Date(user.lastActive).toLocaleString()}`
          : 'Offline'
        : 'Status unavailable';

  return (
    <aside className="fixed bottom-0 right-0 top-14 z-[8000] flex w-[min(360px,100vw)] flex-col overflow-hidden border-l border-[#27272a] bg-[#0f0f12] text-[#fafafa] shadow-2xl">
      <header className="flex h-14 shrink-0 items-center justify-between border-b border-[#27272a] px-5">
        <div>
          <h2 className="font-outfit text-base font-semibold">Profile</h2>
          <p className="text-xs text-[#71717a]">Workspace member</p>
        </div>
        <button
          type="button"
          onClick={onClose}
          aria-label="Close profile"
          className="flex h-9 w-9 items-center justify-center rounded-md text-[#a1a1aa] hover:bg-[#27272a] hover:text-[#fafafa]"
        >
          <Close size={20} color="var(--primary)" />
        </button>
      </header>
      <div className="overflow-y-auto">
        <div className="border-b border-[#27272a] p-5">
          <div className="flex items-center gap-4">
            <Avatar
              width={88}
              borderRadius={16}
              fontSize={32}
              fontWeight={700}
              data={user}
            />
            <div className="min-w-0">
              <h3 className="truncate font-outfit text-xl font-semibold">
                {user.name}
              </h3>
              <p className="mt-1 flex items-center gap-2 text-sm text-[#a1a1aa]">
                <span
                  className={`h-2.5 w-2.5 rounded-full ${
                    user.online === true
                      ? 'bg-[#2bac76]'
                      : 'border border-[#777a80]'
                  }`}
                />
                {statusLabel}
              </p>
              {user.role && (
                <span
                  className="mt-2 inline-flex rounded-md border border-[#3f3f46] bg-[#18181b] px-2 py-0.5 text-xs font-medium"
                  style={{ color: user.role.color }}
                >
                  {user.role.name}
                </span>
              )}
            </div>
          </div>
          <div className="mt-5 flex gap-2">
            {isCurrentUser && (
              <button
                type="button"
                onClick={onEdit}
                className="w-full rounded-md border border-[#3f3f46] bg-[#18181b] px-3 py-2 text-sm font-medium hover:bg-[#27272a]"
              >
                Edit
              </button>
            )}
            {!isCurrentUser && workspaceId && (
              <button
                type="button"
                onClick={() => {
                  onClose();
                  router.push(`/client/${workspaceId}/dm-${user.id}`);
                }}
                className="flex w-full items-center justify-center gap-2 rounded-md bg-[#fafafa] px-4 py-2 text-sm font-medium text-[#18181b] hover:bg-[#e4e4e7]"
              >
                <Messages color="#18181b" />
                Message
              </button>
            )}
          </div>
        </div>
        <div className="p-5">
          <h4 className="text-sm font-medium">Contact information</h4>
          <p className="mt-4 text-xs font-medium text-[#71717a]">
            Email address
          </p>
          <p className="mt-1 break-words text-sm text-[#d4d4d8]">
            {user.email || 'Not shared'}
          </p>
        </div>
      </div>
    </aside>
  );
};

export default ProfileView;
