'use client';
import { useContext, useEffect, useMemo, useRef, useState } from 'react';
import { ChannelList } from 'stream-chat-react';
import clsx from 'clsx';

import AddChannelModal from './AddChannelModal';
import { AppContext } from '../app/client/layout';
import ArrowDropdown from './icons/ArrowDropdown';
import CaretDown from './icons/CaretDown';
import ChannelPreview from './ChannelPreview';
import Compose from './icons/Compose';
import IconButton from './IconButton';
import Refine from './icons/Refine';
import Send from './icons/Send';
import SidebarButton from './SidebarButton';
import Threads from './icons/Threads';
import Plus from './icons/Plus';
import { useSession } from '@/lib/auth-client';
import WorkspaceSettingsModal from './WorkspaceSettingsModal';
import Avatar from './Avatar';
import { useRouter } from 'next/navigation';

const [minWidth, defaultWidth] = [215, 275];

type SidebarProps = {
  layoutWidth: number;
};

const Sidebar = ({ layoutWidth }: SidebarProps) => {
  const { data: session } = useSession();
  const user = session?.user;
  const router = useRouter();
  const {
    loading,
    workspace,
    setWorkspace,
    sidebarMode,
    activities,
    chatClient,
  } = useContext(AppContext);

  const [width, setWidth] = useState<number>(() => {
    const savedWidth =
      parseInt(window.localStorage.getItem('sidebarWidth') as string) ||
      defaultWidth;
    window.localStorage.setItem('sidebarWidth', String(savedWidth));
    return savedWidth;
  });
  const maxWidth = useMemo(() => layoutWidth - 374, [layoutWidth]);

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);

  const isDragged = useRef(false);

  useEffect(() => {
    if (!layoutWidth) return;

    const onMouseMove = (e: MouseEvent) => {
      if (!isDragged.current) {
        return;
      }
      document.body.style.userSelect = 'none';
      document.body.style.cursor = 'col-resize';
      document.querySelectorAll('.sidebar-btn').forEach((el) => {
        el.setAttribute('style', 'cursor: col-resize');
      });
      setWidth((previousWidth) => {
        const newWidth = previousWidth + e.movementX / 1.3;
        if (newWidth < minWidth) {
          return minWidth;
        } else if (newWidth > maxWidth) {
          return maxWidth;
        }
        return newWidth;
      });
    };

    const onMouseUp = () => {
      document.body.style.userSelect = 'auto';
      document.body.style.cursor = 'auto';
      document.querySelectorAll('.sidebar-btn').forEach((el) => {
        el.removeAttribute('style');
      });
      isDragged.current = false;
    };

    window.removeEventListener('mousemove', onMouseMove);
    window.addEventListener('mousemove', onMouseMove);
    window.addEventListener('mouseup', onMouseUp);

    return () => {
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('mouseup', () => onMouseUp);
    };
  }, [layoutWidth, maxWidth]);

  useEffect(() => {
    if (!layoutWidth || layoutWidth < 0) return;

    if (width) {
      let newWidth = width;
      if (width > maxWidth) {
        newWidth = maxWidth;
      }
      setWidth(newWidth);
      localStorage.setItem('sidebarWidth', String(width));
    }
  }, [width, layoutWidth, maxWidth]);

  const openCreateChannelModal = () => {
    setIsModalOpen(true);
  };

  const onModalClose = () => {
    setIsModalOpen(false);
  };

  const isWorkspaceOwner = workspace?.ownerId === user?.id;

  return (
    <div
      id="sidebar"
      style={{ width: `${width}px` }}
      className={clsx(
        'hidden relative px-2 sm:flex flex-col flex-shrink-0 gap-3 min-w-0 min-h-0 max-h-[calc(100svh-44px)] bg-[#10121499] border-r-[1px] border-solid',
        loading ? 'border-r-transparent' : 'border-r-[#797c814d]'
      )}
    >
      {!loading && (
        <>
          <div className="pl-1 w-full h-[49px] flex items-center justify-between">
            <div className="max-w-[calc(100%-80px)]">
              <button
                className="w-fit max-w-full rounded-md py-[3px] px-2 flex items-center text-white hover:bg-hover-gray disabled:cursor-default"
                onClick={() => setSettingsOpen(true)}
                disabled={!isWorkspaceOwner}
                title={isWorkspaceOwner ? 'Customize workspace' : undefined}
              >
                <span className="truncate text-[18px] font-[900] leading-[1.33334]">
                  {workspace.name}
                </span>
                <div className="flex-shrink-0">
                  <CaretDown size={18} color="var(--primary)" />
                </div>
              </button>
            </div>
            <div className="flex ">
              <IconButton
                icon={
                  <Refine className="fill-icon-gray group-hover:fill-white" />
                }
                className="w-9 h-9 hover:bg-hover-gray"
              />
              <IconButton
                icon={
                  <Compose className="fill-icon-gray group-hover:fill-white" />
                }
                className="w-9 h-9 hover:bg-hover-gray"
              />
            </div>
          </div>
          <div className="w-full flex flex-col">
            <SidebarButton icon={Threads} iconSize="lg" title="Threads" />
            <SidebarButton icon={Send} iconSize="lg" title="Drafts & sent" />
          </div>
          <div className="w-full flex flex-col min-h-0">
            <div className="h-7 -ml-1.5 flex items-center px-4 text-[15px] leading-7">
              <button className="hover:bg-hover-gray rounded-md">
                <ArrowDropdown color="var(--icon-gray)" />
              </button>
              <button className="flex px-[5px] max-w-full rounded-md text-sidebar-gray font-medium hover:bg-hover-gray">
                {sidebarMode === 'channels'
                  ? 'Channels'
                  : sidebarMode === 'dms'
                    ? 'Direct messages'
                    : 'Activity'}
              </button>
            </div>
            {sidebarMode === 'channels' && (
              <ChannelList
                filters={{ workspaceId: workspace.id }}
                Preview={ChannelPreview}
                sort={{ created_at: 1 }}
                LoadingIndicator={() => null}
                lockChannelOrder
                allowNewMessagesFromUnfilteredChannels={false}
                channelRenderFilterFn={(channels) =>
                  channels.filter((item) => item.data?.isDm !== true)
                }
              />
            )}
            {sidebarMode === 'dms' && (
              <div className="flex flex-col gap-0.5 mt-1 overflow-y-auto">
                {workspace.memberships
                  .filter((membership) => membership.userId !== user?.id)
                  .map((membership) => (
                    <button
                      key={membership.userId}
                      type="button"
                      onClick={() =>
                        router.push(
                          `/client/${workspace.id}/dm-${membership.userId}`
                        )
                      }
                      className="sidebar-btn flex items-center gap-2 h-8 px-3 rounded-md text-[15px] text-sidebar-gray hover:bg-hover-gray hover:text-white"
                    >
                      <Avatar
                        width={22}
                        borderRadius={5}
                        fontSize={12}
                        data={membership.user}
                      />
                      <span className="truncate">{membership.user.name}</span>
                    </button>
                  ))}
                {workspace.memberships.length <= 1 && (
                  <p className="px-3 py-2 text-xs text-[#ababad]">
                    Invite a teammate to start a direct message.
                  </p>
                )}
              </div>
            )}
            {sidebarMode === 'activity' && (
              <div className="mt-1 flex min-h-0 flex-col gap-1 overflow-y-auto">
                {activities.map((activity) => (
                  <button
                    key={activity.id}
                    type="button"
                    onClick={async () => {
                      const [target] = await chatClient.queryChannels(
                        { cid: activity.cid },
                        {},
                        { limit: 1 }
                      );
                      if (!target) return;
                      const ids = target.data?.dmUserIds as
                        | string[]
                        | undefined;
                      const peerId = ids?.find((id) => id !== user?.id);
                      const routeId =
                        target.data?.isDm === true && peerId
                          ? `dm-${peerId}`
                          : target.id;
                      router.push(
                        `/client/${workspace.id}/${routeId}#message-${activity.id}`
                      );
                    }}
                    className="flex gap-2 rounded-md px-2 py-2 text-left hover:bg-hover-gray"
                  >
                    <Avatar
                      width={30}
                      borderRadius={7}
                      fontSize={13}
                      data={activity.user}
                    />
                    <span className="min-w-0 flex-1">
                      <span className="flex items-center gap-1 text-xs font-bold text-white">
                        {activity.user.name}
                        <span className="rounded bg-[#3b3151] px-1 text-[10px] text-[#d7c8ff]">
                          {activity.type === 'mention' ? '@ mention' : 'DM'}
                        </span>
                      </span>
                      <span className="mt-0.5 block truncate text-xs text-[#b9babd]">
                        {activity.text}
                      </span>
                    </span>
                  </button>
                ))}
                {!activities.length && (
                  <div className="px-3 py-5 text-center text-xs text-[#ababad]">
                    Mentions and direct-message notifications will appear here.
                  </div>
                )}
              </div>
            )}
            {sidebarMode === 'channels' && isWorkspaceOwner && (
              <SidebarButton
                icon={Plus}
                title="Add a channel"
                onClick={openCreateChannelModal}
              />
            )}
          </div>
          {/* Handle */}
          <div
            className="absolute -right-1 w-2 h-full bg-transparent cursor-col-resize"
            onMouseDown={() => {
              isDragged.current = true;
            }}
          />
          <AddChannelModal open={isModalOpen} onClose={onModalClose} />
          {isWorkspaceOwner && (
            <WorkspaceSettingsModal
              open={settingsOpen}
              workspace={workspace}
              onClose={() => setSettingsOpen(false)}
              onSave={setWorkspace}
            />
          )}
        </>
      )}
    </div>
  );
};

export default Sidebar;
