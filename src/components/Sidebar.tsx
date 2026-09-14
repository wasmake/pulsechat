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
import WorkspaceSettingsModal, {
  WorkspaceSettingsTab,
} from './WorkspaceSettingsModal';
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
    presenceById,
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
  const [workspaceMenuOpen, setWorkspaceMenuOpen] = useState(false);
  const [settingsTab, setSettingsTab] =
    useState<WorkspaceSettingsTab>('overview');
  const workspaceMenu = useRef<HTMLDivElement>(null);

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
  const currentMembership = workspace?.memberships.find(
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
  const legacyAdmin = currentMembership?.role?.toLowerCase() === 'admin';
  const canManage =
    isWorkspaceOwner || legacyAdmin || rolePermissions.length > 0;
  const canManageInvites =
    isWorkspaceOwner ||
    legacyAdmin ||
    rolePermissions.includes('manage_invites');

  useEffect(() => {
    const closeMenu = (event: PointerEvent) => {
      if (!workspaceMenu.current?.contains(event.target as Node)) {
        setWorkspaceMenuOpen(false);
      }
    };
    window.addEventListener('pointerdown', closeMenu);
    return () => window.removeEventListener('pointerdown', closeMenu);
  }, []);

  const openSettings = (nextTab: WorkspaceSettingsTab) => {
    setSettingsTab(nextTab);
    setSettingsOpen(true);
    setWorkspaceMenuOpen(false);
  };

  return (
    <div
      id="sidebar"
      style={{ width: `${width}px` }}
      className={clsx(
        'relative hidden min-h-0 min-w-0 flex-shrink-0 flex-col gap-3 border-r bg-[#0f0f12] px-2 sm:flex',
        loading ? 'border-r-transparent' : 'border-r-[#27272a]'
      )}
    >
      {!loading && (
        <>
          <div className="pl-1 w-full h-[49px] flex items-center justify-between">
            <div
              ref={workspaceMenu}
              className="relative max-w-[calc(100%-80px)]"
            >
              <button
                className="flex w-fit max-w-full items-center rounded-md px-2 py-[3px] text-[#fafafa] hover:bg-[#27272a] disabled:cursor-default"
                onClick={() => setWorkspaceMenuOpen((current) => !current)}
                disabled={!canManage}
                aria-expanded={workspaceMenuOpen}
                title={canManage ? 'Workspace menu' : undefined}
              >
                <span className="truncate font-outfit text-base font-semibold leading-[1.33334]">
                  {workspace.name}
                </span>
                <div className="flex-shrink-0">
                  <CaretDown size={18} color="var(--primary)" />
                </div>
              </button>
              {workspaceMenuOpen && (
                <div className="absolute left-0 top-9 z-[10000] w-60 overflow-hidden rounded-lg border border-[#27272a] bg-[#0f0f12] p-1.5 text-sm text-[#d4d4d8] shadow-2xl">
                  {canManageInvites && (
                    <button
                      type="button"
                      onClick={() => openSettings('invites')}
                      className="w-full rounded-md px-3 py-2 text-left hover:bg-[#27272a] hover:text-[#fafafa]"
                    >
                      Invite people
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={() => openSettings('overview')}
                    className="w-full rounded-md px-3 py-2 text-left hover:bg-[#27272a] hover:text-[#fafafa]"
                  >
                    Workspace settings
                  </button>
                  <div className="my-1 h-px bg-[#27272a]" />
                  <button
                    type="button"
                    onClick={() => router.push('/')}
                    className="w-full rounded-md px-3 py-2 text-left text-[#a1a1aa] hover:bg-[#27272a] hover:text-[#fafafa]"
                  >
                    Switch workspace
                  </button>
                </div>
              )}
            </div>
            <div className="flex ">
              <IconButton
                icon={
                  <Refine className="fill-icon-gray group-hover:fill-white" />
                }
                className="h-9 w-9 hover:bg-[#27272a]"
              />
              <IconButton
                icon={
                  <Compose className="fill-icon-gray group-hover:fill-white" />
                }
                className="h-9 w-9 hover:bg-[#27272a]"
              />
            </div>
          </div>
          <div className="w-full flex flex-col">
            <SidebarButton icon={Threads} iconSize="lg" title="Threads" />
            <SidebarButton icon={Send} iconSize="lg" title="Drafts & sent" />
          </div>
          <div className="w-full flex flex-col min-h-0">
            <div className="h-7 -ml-1.5 flex items-center px-4 text-[15px] leading-7">
              <button className="rounded-md hover:bg-[#27272a]">
                <ArrowDropdown color="var(--icon-gray)" />
              </button>
              <button className="flex max-w-full rounded-md px-[5px] font-medium text-[#a1a1aa] hover:bg-[#27272a]">
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
                      className="sidebar-btn flex h-8 items-center gap-2 rounded-md px-3 text-[15px] text-[#a1a1aa] hover:bg-[#27272a] hover:text-[#fafafa]"
                    >
                      <span className="relative">
                        <Avatar
                          width={22}
                          borderRadius={5}
                          fontSize={12}
                          data={
                            presenceById[membership.userId] || membership.user
                          }
                        />
                        <span
                          className={`absolute -bottom-0.5 -right-0.5 h-2.5 w-2.5 rounded-full border-2 border-[#0f0f12] ${
                            presenceById[membership.userId]?.online
                              ? 'bg-[#2bac76]'
                              : 'bg-[#777a80]'
                          }`}
                        />
                      </span>
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
                    className="flex gap-2 rounded-md px-2 py-2 text-left hover:bg-[#27272a]"
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
            {sidebarMode === 'channels' &&
              (isWorkspaceOwner ||
                legacyAdmin ||
                rolePermissions.includes('manage_channels')) && (
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
          {canManage && (
            <WorkspaceSettingsModal
              open={settingsOpen}
              workspace={workspace}
              initialTab={settingsTab}
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
