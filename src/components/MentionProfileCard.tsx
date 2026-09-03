'use client';

import { createPortal } from 'react-dom';
import type { UserResponse } from 'stream-chat';
import { useContext, useState } from 'react';
import { useRouter } from 'next/navigation';

import { AppContext } from '@/app/client/layout';
import { useSession } from '@/lib/auth-client';
import Avatar from './Avatar';
import Headphones from './icons/Headphones';
import Messages from './icons/Messages';

const MentionProfileCard = ({
  user,
  position,
  onClose,
}: {
  user: UserResponse;
  position: { x: number; y: number };
  onClose: () => void;
}) => {
  const router = useRouter();
  const { data: session } = useSession();
  const {
    workspace,
    presenceById,
    setSelectedProfile,
    videoClient,
    setChannelCall,
  } = useContext(AppContext);
  const [startingHuddle, setStartingHuddle] = useState(false);
  const member = workspace.memberships.find(
    (item) => item.userId === user.id
  )?.user;
  const profile = presenceById[user.id] || {
    id: user.id,
    name: user.name || member?.name || 'Member',
    email: member?.email,
    image: typeof user.image === 'string' ? user.image : member?.image,
    online: user.online,
    lastActive: user.last_active,
  };
  const isCurrentUser = user.id === session?.user.id;

  const startHuddle = async () => {
    if (!session?.user.id || startingHuddle) return;
    setStartingHuddle(true);
    try {
      const callId = `direct-${[session.user.id, user.id].sort().join('-')}`;
      const call = videoClient.call('default', callId);
      await call.getOrCreate({
        ring: true,
        data: {
          custom: {
            channelName: profile.name,
            createdBy: session.user.name,
            createdByUserImage: session.user.image,
          },
          members: [session.user.id, user.id].map((userId) => ({
            user_id: userId,
          })),
        },
      });
      await call.join();
      setChannelCall(call);
      onClose();
    } finally {
      setStartingHuddle(false);
    }
  };

  return createPortal(
    <div className="fixed inset-0 z-[13000]" onMouseDown={onClose}>
      <div
        role="dialog"
        aria-label={`${profile.name} quick profile`}
        onMouseDown={(event) => event.stopPropagation()}
        style={{
          left: Math.min(position.x, window.innerWidth - 320),
          top: Math.min(position.y + 12, window.innerHeight - 280),
        }}
        className="fixed w-[300px] rounded-xl border border-[#797c814d] bg-[#1a1d21] p-4 text-white shadow-2xl"
      >
        <div className="flex items-center gap-3">
          <Avatar width={56} borderRadius={12} fontSize={22} data={profile} />
          <div className="min-w-0">
            <button
              type="button"
              onClick={() => {
                setSelectedProfile(profile);
                onClose();
              }}
              className="block truncate text-left text-lg font-black hover:underline"
            >
              {profile.name}
            </button>
            <p className="mt-1 flex items-center gap-1.5 text-xs text-[#b9babd]">
              <span
                className={`h-2.5 w-2.5 rounded-full ${
                  profile.online ? 'bg-[#2bac76]' : 'border border-[#777a80]'
                }`}
              />
              {profile.online ? 'Active' : 'Offline'}
            </p>
          </div>
        </div>
        {!isCurrentUser && (
          <div className="mt-4 grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={() => {
                router.push(`/client/${workspace.id}/dm-${user.id}`);
                onClose();
              }}
              className="flex items-center justify-center gap-2 rounded-md bg-[#007a5a] px-3 py-2 text-sm font-bold hover:bg-[#148567]"
            >
              <Messages color="var(--primary)" /> DM
            </button>
            <button
              type="button"
              onClick={startHuddle}
              disabled={startingHuddle}
              className="flex items-center justify-center gap-2 rounded-md border border-[#797c814d] px-3 py-2 text-sm font-bold hover:bg-hover-gray disabled:opacity-60"
            >
              <Headphones color="var(--primary)" />
              {startingHuddle ? 'Starting' : 'Huddle'}
            </button>
          </div>
        )}
        {profile.email && (
          <p className="mt-3 truncate border-t border-[#797c814d] pt-3 text-xs text-[#1d9bd1]">
            {profile.email}
          </p>
        )}
      </div>
    </div>,
    document.body
  );
};

export default MentionProfileCard;
