'use client';
import { useContext, useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Channel as ChannelType } from 'stream-chat';
import { DefaultStreamChatGenerics } from 'stream-chat-react';
import { StreamCall, useCalls } from '@stream-io/video-react-sdk';
import clsx from 'clsx';

import { AppContext } from '../../layout';
import CaretDown from '@/components/icons/CaretDown';
import ChannelChat from '@/components/ChannelChat';
import ChannelLoading from '@/components/ChannelLoading';
import Files from '@/components/icons/Files';
import Hash from '@/components/icons/Hash';
import Headphones from '@/components/icons/Headphones';
import HuddleToggleButton from '@/components/HuddleToggleButton';
import Message from '@/components/icons/Message';
import MoreVert from '@/components/icons/MoreVert';
import Pin from '@/components/icons/Pin';
import Plus from '@/components/icons/Plus';
import User from '@/components/icons/User';
import { useSession } from '@/lib/auth-client';
import AddChannelModal from '@/components/AddChannelModal';

interface ChannelProps {
  params: {
    workspaceId: string;
    channelId: string;
  };
}

const stableDmChannelId = (workspaceId: string, userIds: string[]) => {
  const value = `${workspaceId}:${[...userIds].sort().join(':')}`;
  let hash = 2166136261;
  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return `dm-${(hash >>> 0).toString(36)}`;
};

const Channel = ({ params }: ChannelProps) => {
  const { workspaceId, channelId } = params;
  const router = useRouter();
  const { data: session } = useSession();
  const user = session?.user;
  const isDm = channelId.startsWith('dm-');
  const dmUserId = isDm ? channelId.slice(3) : null;
  const [currentCall] = useCalls();
  const {
    chatClient,
    loading,
    setLoading,
    workspace,
    setWorkspace,
    setOtherWorkspaces,
    channel,
    setChannel,
    channelCall,
    setChannelCall,
    videoClient,
  } = useContext(AppContext);

  const [chatChannel, setChatChannel] =
    useState<ChannelType<DefaultStreamChatGenerics>>();
  const [channelLoading, setChannelLoading] = useState(true);
  const [pageWidth, setPageWidth] = useState(0);
  const [activeTab, setActiveTab] = useState<'messages' | 'pins'>('messages');
  const [channelEditorOpen, setChannelEditorOpen] = useState(false);
  const [channelMenuOpen, setChannelMenuOpen] = useState(false);
  const layoutRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (loading || !layoutRef.current) return;
    const resizeObserver = new ResizeObserver((entries) => {
      for (const entry of entries) {
        setPageWidth(entry.contentRect.width);
      }
    });
    resizeObserver.observe(layoutRef.current);

    return () => {
      resizeObserver.disconnect();
    };
  }, [layoutRef, loading]);

  useEffect(() => {
    const loadWorkspace = async () => {
      try {
        const response = await fetch(`/api/workspaces/${workspaceId}`);
        const result = await response.json();
        if (response.ok) {
          setWorkspace(result.workspace);
          setOtherWorkspaces(result.otherWorkspaces);
          localStorage.setItem(
            'activitySession',
            JSON.stringify({ workspaceId, channelId })
          );
          setLoading(false);
        } else {
          console.error('Error fetching workspace data:', result.error);
          router.push('/');
        }
      } catch (error) {
        console.error('Error fetching workspace data:', error);
        router.push('/');
      }
    };

    const loadChannel = async () => {
      const dmMember = workspace.memberships.find(
        (item) => item.userId === dmUserId
      );
      const currentMembers = isDm
        ? [user!.id, dmUserId!]
        : workspace.memberships.map((m) => m.userId);
      const streamChannelId = isDm
        ? stableDmChannelId(workspaceId, currentMembers)
        : channelId;
      const selectedChannel = workspace.channels.find(
        (item) => item.id === channelId
      );
      if ((!isDm && !selectedChannel) || (isDm && !dmMember)) {
        router.push(`/client/${workspaceId}`);
        return;
      }
      const nextChatChannel = chatClient.channel('messaging', streamChannelId, {
        members: currentMembers,
        name: isDm ? dmMember!.user.name : selectedChannel!.name,
        description: isDm ? 'Direct message' : selectedChannel!.description,
        workspaceId,
        isDm,
        dmUserIds: isDm ? currentMembers : undefined,
      });

      if (!isDm && currentCall?.id === channelId) {
        setChannelCall(currentCall);
      } else if (!isDm) {
        const channelCall = videoClient?.call('default', channelId);
        setChannelCall(channelCall);
      } else {
        setChannelCall(undefined);
      }

      setChatChannel(nextChatChannel);
      setChannelLoading(false);
    };

    const loadWorkspaceAndChannel = async () => {
      if (!workspace || workspace.id !== workspaceId) {
        await loadWorkspace();
      } else {
        if (!isDm && channel?.id !== channelId)
          setChannel(workspace.channels.find((c) => c.id === channelId)!);
        if (loading) setLoading(false);
        if (chatClient) loadChannel();
      }
    };

    const expectedChannelId =
      isDm && user && dmUserId
        ? stableDmChannelId(workspaceId, [user.id, dmUserId])
        : channelId;
    if ((!chatChannel || chatChannel.id !== expectedChannelId) && user)
      loadWorkspaceAndChannel();
  }, [
    channel,
    channelId,
    chatChannel,
    chatClient,
    currentCall,
    loading,
    router,
    setChannel,
    setChannelCall,
    setLoading,
    setOtherWorkspaces,
    setWorkspace,
    user,
    videoClient,
    workspace,
    workspaceId,
    isDm,
    dmUserId,
  ]);

  useEffect(() => {
    if (currentCall?.id === channelId) {
      setChannelCall(currentCall);
    }
  }, [currentCall, channelId, setChannelCall]);

  if (loading) return null;

  const dmMember = workspace.memberships.find(
    (item) => item.userId === dmUserId
  );
  const displayChannel = workspace.channels.find(
    (item) => item.id === channelId
  );
  const conversationName = isDm ? dmMember?.user.name : displayChannel?.name;
  const conversationDescription = isDm
    ? dmMember?.user.email
    : displayChannel?.description;
  const currentMembership = workspace.memberships.find(
    (membership) => membership.userId === user?.id
  );
  let rolePermissions: string[] = [];
  try {
    rolePermissions = JSON.parse(
      currentMembership?.workspaceRole?.permissions || '[]'
    );
  } catch {
    rolePermissions = [];
  }
  const canManageChannels =
    workspace.ownerId === user?.id ||
    currentMembership?.role?.toLowerCase() === 'admin' ||
    rolePermissions.includes('manage_channels');

  return (
    <div
      ref={layoutRef}
      className="channel z-100 flex h-full w-full flex-col overflow-hidden bg-[#0f0f12] font-lato text-[#d4d4d8]"
    >
      {/* Toolbar */}
      <div className="relative flex h-[49px] flex-shrink-0 items-center justify-between border-b border-[#27272a] px-3 pl-4">
        <div className="flex flex-[1_1_0] items-center min-w-0">
          <button
            type="button"
            onClick={() => {
              if (!isDm && canManageChannels) setChannelEditorOpen(true);
            }}
            disabled={isDm || !canManageChannels}
            title={!isDm && canManageChannels ? 'Edit channel' : undefined}
            className="-ml-1 mr-2 flex min-w-[96px] flex-[0_auto] items-center rounded-md px-2 py-1 text-base leading-[1.33334] text-[#e4e4e7] hover:bg-[#27272a] disabled:cursor-default disabled:hover:bg-transparent"
          >
            <span className="mr-1 align-text-bottom">
              {isDm ? (
                <User color="var(--channel-gray)" size={18} />
              ) : (
                <Hash color="var(--channel-gray)" size={18} />
              )}
            </span>
            <span className="truncate font-semibold">{conversationName}</span>
          </button>
          <div
            className={clsx(
              'mr-2 w-[96px] min-w-[96px] flex-[1_1_0] pt-1 text-[12.8px] text-[#71717a]',
              pageWidth > 0 && pageWidth < 500 ? 'hidden' : 'flex'
            )}
          >
            <span className="min-w-[96px] max-w-[min(70%,540px)] truncate">
              {conversationDescription}
            </span>
          </div>
        </div>
        <div className="flex flex-none ml-auto items-center">
          {!isDm && (
            <button
              className={clsx(
                'flex h-7 items-center rounded-md border border-[#3f3f46] py-[3px] pl-2 text-[#a1a1aa] hover:bg-[#27272a]',
                pageWidth > 0 && pageWidth < 605 ? 'hidden' : 'flex'
              )}
            >
              <User color="var(--icon-gray)" />
              <span className="pl-1 pr-2 text-[12.8px]">
                {workspace.memberships.length}
              </span>
            </button>
          )}
          {!isDm && channelCall && (
            <StreamCall call={channelCall}>
              <HuddleToggleButton currentCall={currentCall} />
            </StreamCall>
          )}
          {!isDm && !channelCall && (
            <div className="ml-2 flex h-7 w-[59px] items-center rounded-md border border-[#3f3f46] text-[#a1a1aa]">
              <button className="px-2 h-[26px] hover:bg-[#25272b] rounded-l-lg">
                <Headphones color="var(--icon-gray)" />
              </button>
              <div className="h-5 w-px bg-[#3f3f46]" />
              <button className="w-5 h-[26px] hover:bg-[#25272b] rounded-r-lg">
                <CaretDown color="var(--icon-gray)" />
              </button>
            </div>
          )}
          <button
            type="button"
            onClick={() => setChannelMenuOpen((current) => !current)}
            aria-expanded={channelMenuOpen}
            aria-label="Channel options"
            className="group ml-2 flex h-7 w-7 items-center justify-center rounded-md hover:bg-[#27272a]"
          >
            <MoreVert className="fill-[#e8e8e8b3] group-hover:fill-channel-gray" />
          </button>
        </div>
        {channelMenuOpen && (
          <div className="absolute right-3 top-11 z-50 w-48 rounded-lg border border-[#27272a] bg-[#0f0f12] p-1.5 text-sm text-[#d4d4d8] shadow-2xl">
            {canManageChannels && !isDm && (
              <button
                type="button"
                onClick={() => {
                  setChannelMenuOpen(false);
                  setChannelEditorOpen(true);
                }}
                className="w-full rounded-md px-3 py-2 text-left hover:bg-[#27272a] hover:text-[#fafafa]"
              >
                Edit channel
              </button>
            )}
            <button
              type="button"
              onClick={() => {
                navigator.clipboard.writeText(location.href);
                setChannelMenuOpen(false);
              }}
              className="w-full rounded-md px-3 py-2 text-left hover:bg-[#27272a] hover:text-[#fafafa]"
            >
              Copy channel link
            </button>
          </div>
        )}
      </div>
      {/* Tab Bar */}
      <div className="flex h-10 w-full min-w-full max-w-full items-center gap-1 border-b border-[#27272a] px-4">
        <button
          type="button"
          onClick={() => setActiveTab('messages')}
          className={clsx(
            'flex h-full cursor-pointer items-center gap-1 rounded-sm px-2 text-center text-sm font-medium text-[#a1a1aa] hover:text-[#fafafa]',
            activeTab === 'messages' &&
              'border-b-2 border-[#fafafa] text-[#fafafa]'
          )}
        >
          <Message color="var(--primary)" />
          Messages
        </button>
        <button
          type="button"
          className="group flex h-full cursor-pointer items-center gap-1 rounded-sm px-2 text-center text-sm font-medium text-[#71717a] hover:text-[#fafafa]"
        >
          <Files className="fill-icon-gray group-hover:fill-white" size={16} />
          Files
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('pins')}
          className={clsx(
            'group flex h-full cursor-pointer items-center gap-1 rounded-sm px-2 text-center text-sm font-medium text-[#a1a1aa] hover:text-[#fafafa]',
            activeTab === 'pins' && 'border-b-2 border-[#fafafa] text-[#fafafa]'
          )}
        >
          <Pin className="fill-icon-gray group-hover:fill-white" size={16} />
          Pins
        </button>
        <div className="group flex items-center justify-center cursor-pointer h-7 w-7 rounded-full hover:bg-hover-gray">
          <Plus
            filled
            className="fill-icon-gray group-hover:fill-white"
            size={16}
          />
        </div>
      </div>
      {/* Chat */}
      <div className="relative flex flex-col w-full h-full flex-1 overflow-hidden ">
        {/* Body */}
        <div className="relative flex-1">
          <div className="absolute -top-2 bottom-0 flex w-full overflow-hidden">
            <div
              style={{
                width: pageWidth > 0 ? pageWidth : '100%',
              }}
              className="relative"
            >
              <div className="absolute inset-0 z-[2] overflow-hidden">
                {/* Messages */}
                {channelLoading && <ChannelLoading />}
                {!channelLoading && (
                  <ChannelChat channel={chatChannel!} activeTab={activeTab} />
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
      {!isDm && displayChannel && canManageChannels && (
        <AddChannelModal
          open={channelEditorOpen}
          onClose={() => setChannelEditorOpen(false)}
          channel={displayChannel}
        />
      )}
    </div>
  );
};

export default Channel;
