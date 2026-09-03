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

  return (
    <aside className="fixed bottom-1 right-1 top-10 z-[8000] flex w-[min(380px,calc(100vw-8px))] flex-col overflow-hidden rounded-lg border border-[#797c814d] bg-[#1a1d21] text-white shadow-2xl">
      <header className="flex h-14 shrink-0 items-center justify-between border-b border-[#797c814d] px-5">
        <h2 className="text-lg font-bold">Profile</h2>
        <button
          type="button"
          onClick={onClose}
          aria-label="Close profile"
          className="flex h-9 w-9 items-center justify-center rounded-lg hover:bg-hover-gray"
        >
          <Close size={20} color="var(--primary)" />
        </button>
      </header>
      <div className="overflow-y-auto">
        <div className="p-5">
          <Avatar
            width={180}
            borderRadius={14}
            fontSize={64}
            fontWeight={700}
            data={user}
          />
          <div className="mt-5 flex items-start justify-between gap-4">
            <div className="min-w-0">
              <h3 className="truncate text-[22px] font-black">{user.name}</h3>
              <p className="mt-1 flex items-center gap-2 text-sm text-[#b9babd]">
                <span
                  className={`h-2.5 w-2.5 rounded-full ${
                    user.online ? 'bg-[#2bac76]' : 'border border-[#777a80]'
                  }`}
                />
                {user.online ? 'Active' : 'Away'}
              </p>
            </div>
            {isCurrentUser && (
              <button
                type="button"
                onClick={onEdit}
                className="rounded-md border border-[#797c814d] px-3 py-1.5 text-sm font-bold hover:bg-hover-gray"
              >
                Edit
              </button>
            )}
          </div>
          {!isCurrentUser && workspaceId && (
            <button
              type="button"
              onClick={() => {
                onClose();
                router.push(`/client/${workspaceId}/dm-${user.id}`);
              }}
              className="mt-5 flex w-full items-center justify-center gap-2 rounded-md bg-[#007a5a] px-4 py-2 font-bold hover:bg-[#148567]"
            >
              <Messages color="var(--primary)" />
              Message
            </button>
          )}
        </div>
        <div className="border-t border-[#797c814d] px-5 py-4">
          <h4 className="text-sm font-bold">Contact information</h4>
          <p className="mt-3 text-xs font-bold uppercase tracking-wide text-[#777a80]">
            Email address
          </p>
          <p className="mt-1 break-words text-sm text-[#1d9bd1]">
            {user.email || 'Not shared'}
          </p>
        </div>
      </div>
    </aside>
  );
};

export default ProfileView;
