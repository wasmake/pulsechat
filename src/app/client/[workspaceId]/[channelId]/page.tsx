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

  return (
    <div
      ref={layoutRef}
      className="channel bg-[#1a1d21] font-lato w-full h-full z-100 flex flex-col overflow-hidden text-channel-gray"
    >
      {/* Toolbar */}
      <div className="pl-4 pr-3 h-[49px] flex items-center flex-shrink-0 justify-between">
        <div className="flex flex-[1_1_0] items-center min-w-0">
          <button className="min-w-[96px] px-2 py-[3px] -ml-1 mr-2 flex flex-[0_auto] items-center text-[17.8px] rounded-md text-channel-gray hover:bg-[#d1d2d30b] leading-[1.33334]">
            <span className="mr-1 align-text-bottom">
              {isDm ? (
                <User color="var(--channel-gray)" size={18} />
              ) : (
                <Hash color="var(--channel-gray)" size={18} />
              )}
            </span>
            <span className="truncate font-[900]">{conversationName}</span>
          </button>
          <div
            className={clsx(
              'w-[96px] flex-[1_1_0] min-w-[96px] mr-2 pt-1 text-[12.8px] text-[#e8e8e8b3]',
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
                'flex items-center pl-2 py-[3px] rounded-lg h-7 border border-[#797c814d] text-[#e8e8e8b3] hover:bg-[#25272b]',
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
            <div className="w-[59px] flex items-center ml-2 rounded-lg h-7 border border-[#797c814d] text-[#e8e8e8b3]">
              <button className="px-2 h-[26px] hover:bg-[#25272b] rounded-l-lg">
                <Headphones color="var(--icon-gray)" />
              </button>
              <div className="h-5 w-[1px] bg-[#797c814d]" />
              <button className="w-5 h-[26px] hover:bg-[#25272b] rounded-r-lg">
                <CaretDown color="var(--icon-gray)" />
              </button>
            </div>
          )}
          <button className="group rounded-lg flex w-7 h-7 ml-2 items-center justify-center hover:bg-[#d1d2d30b]">
            <MoreVert className="fill-[#e8e8e8b3] group-hover:fill-channel-gray" />
          </button>
        </div>
      </div>
      {/* Tab Bar */}
      <div className="w-full min-w-full max-w-full h-[38px] flex items-center pl-4 pr-3 shadow-[inset_0_-1px_0_0_#797c814d] gap-1">
        <button
          type="button"
          onClick={() => setActiveTab('messages')}
          className={clsx(
            'flex items-center cursor-pointer w-[92.45px] h-full p-2 gap-1 text-[13px] leading-[1.38463] text-center font-bold rounded-t-lg hover:bg-hover-gray',
            activeTab === 'messages' && 'border-b-[2px] border-white'
          )}
        >
          <Message color="var(--primary)" />
          Messages
        </button>
        <button
          type="button"
          className="group flex items-center cursor-pointer text-[#b9babd] h-full p-2 gap-1 text-[13px] leading-[1.38463] text-center font-bold rounded-t-lg hover:bg-hover-gray hover:text-white"
        >
          <Files className="fill-icon-gray group-hover:fill-white" size={16} />
          Files
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('pins')}
          className={clsx(
            'group flex items-center cursor-pointer text-[#b9babd] h-full p-2 gap-1 text-[13px] leading-[1.38463] text-center font-bold rounded-t-lg hover:bg-hover-gray hover:text-white',
            activeTab === 'pins' && 'border-b-[2px] border-white text-white'
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
    </div>
  );
};

export default Channel;
