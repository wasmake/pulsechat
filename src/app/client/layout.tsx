'use client';
import {
  createContext,
  CSSProperties,
  ReactNode,
  useEffect,
  useState,
} from 'react';
import {
  Channel,
  Invitation,
  Membership,
  Workspace as PrismaWorkspace,
} from '@prisma/client';
import { StreamChat } from 'stream-chat';
import type { MessageResponse } from 'stream-chat';
import { Chat } from 'stream-chat-react';
import {
  Call,
  StreamVideo,
  StreamVideoClient,
} from '@stream-io/video-react-sdk';

import ArrowBack from '@/components/icons/ArrowBack';
import ArrowForward from '@/components/icons/ArrowForward';
import Avatar from '@/components/Avatar';
import Bookmark from '@/components/icons/Bookmark';
import Clock from '@/components/icons/Clock';
import IconButton from '@/components/IconButton';
import Help from '@/components/icons/Help';
import Home from '@/components/icons/Home';
import Plus from '@/components/icons/Plus';
import Messages from '@/components/icons/Messages';
import MoreHoriz from '@/components/icons/MoreHoriz';
import Notifications from '@/components/icons/Notifications';
import RailButton from '@/components/RailButton';
import SearchBar from '@/components/SearchBar';
import WorkspaceLayout from '@/components/WorkspaceLayout';
import WorkspaceSwitcher from '@/components/WorkspaceSwitcher';
import UserSettingsModal from '@/components/UserSettingsModal';
import ProfileView from '@/components/ProfileView';
import { signOut, useSession } from '@/lib/auth-client';

interface LayoutProps {
  children?: ReactNode;
  params: Promise<{ workspaceId: string }>;
}

export type Workspace = PrismaWorkspace & {
  channels: Channel[];
  memberships: Array<
    Membership & {
      user: { id: string; name: string; email: string; image: string | null };
    }
  >;
  invitations: Invitation[];
};

export type ProfileUser = {
  id: string;
  name: string;
  email?: string;
  image?: string | null;
  online?: boolean;
  lastActive?: string;
};

export type ActivityItem = {
  id: string;
  cid: string;
  text: string;
  createdAt: string;
  type: 'mention' | 'dm';
  user: ProfileUser;
};

export const AppContext = createContext<{
  workspace: Workspace;
  setWorkspace: (workspace: Workspace) => void;
  otherWorkspaces: Workspace[];
  setOtherWorkspaces: (workspaces: Workspace[]) => void;
  channel: Channel;
  setChannel: (channel: Channel) => void;
  loading: boolean;
  setLoading: (loading: boolean) => void;
  chatClient: StreamChat;
  setChatClient: (chatClient: StreamChat) => void;
  videoClient: StreamVideoClient;
  setVideoClient: (videoClient: StreamVideoClient) => void;
  channelCall: Call | undefined;
  setChannelCall: (call: Call | undefined) => void;
  sidebarMode: 'channels' | 'dms' | 'activity';
  setSidebarMode: (mode: 'channels' | 'dms' | 'activity') => void;
  selectedProfile: ProfileUser | null;
  setSelectedProfile: (user: ProfileUser | null) => void;
  activities: ActivityItem[];
  unreadCount: number;
  presenceById: Record<string, ProfileUser>;
}>({
  workspace: {} as Workspace,
  setWorkspace: () => {},
  otherWorkspaces: [],
  setOtherWorkspaces: () => {},
  channel: {} as Channel,
  setChannel: () => {},
  loading: false,
  setLoading: () => {},
  chatClient: {} as StreamChat,
  setChatClient: () => {},
  videoClient: {} as StreamVideoClient,
  setVideoClient: () => {},
  channelCall: undefined,
  setChannelCall: () => {},
  sidebarMode: 'channels',
  setSidebarMode: () => {},
  selectedProfile: null,
  setSelectedProfile: () => {},
  activities: [],
  unreadCount: 0,
  presenceById: {},
});

const tokenProvider = async () => {
  const response = await fetch('/api/token', {
    method: 'POST',
  });
  if (!response.ok) throw new Error('Unable to create Stream token');
  const data = await response.json();
  return data.token;
};

const API_KEY = process.env.NEXT_PUBLIC_STREAM_API_KEY as string;

const Layout = ({ children }: LayoutProps) => {
  const { data: session } = useSession();
  const user = session?.user;
  const [loading, setLoading] = useState(true);
  const [workspace, setWorkspace] = useState<Workspace>();
  const [channel, setChannel] = useState<Channel>();
  const [otherWorkspaces, setOtherWorkspaces] = useState<Workspace[]>([]);
  const [chatClient, setChatClient] = useState<StreamChat>();
  const [videoClient, setVideoClient] = useState<StreamVideoClient>();
  const [channelCall, setChannelCall] = useState<Call>();
  const [sidebarMode, setSidebarMode] = useState<
    'channels' | 'dms' | 'activity'
  >('channels');
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [selectedProfile, setSelectedProfile] = useState<ProfileUser | null>(
    null
  );
  const [activities, setActivities] = useState<ActivityItem[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [presenceById, setPresenceById] = useState<Record<string, ProfileUser>>(
    {}
  );

  useEffect(() => {
    const customProvider = async () => {
      const token = await tokenProvider();
      return token;
    };

    const setUpChatAndVideo = async () => {
      const chatClient = StreamChat.getInstance(API_KEY);
      const chatUser = {
        id: user!.id,
        name: user!.name,
        image: user!.image || undefined,
      };

      if (!chatClient.user) {
        await chatClient.connectUser(chatUser, customProvider);
      }

      setChatClient(chatClient);
      const videoClient = StreamVideoClient.getOrCreateInstance({
        apiKey: API_KEY,
        user: chatUser,
        tokenProvider: customProvider,
      });
      setVideoClient(videoClient);
    };

    if (user) setUpChatAndVideo();
  }, [user, videoClient, chatClient]);

  useEffect(() => {
    if (!workspace?.memberships.length || !chatClient?.userID) return;
    let active = true;
    const refreshPresence = async () => {
      const ids = workspace.memberships.map(({ userId }) => userId);
      try {
        const response = await chatClient.queryUsers(
          { id: { $in: ids } },
          [{ id: 1 }],
          { presence: true, limit: 100 }
        );
        if (!active) return;
        setPresenceById(
          Object.fromEntries(
            response.users.map((streamUser) => {
              const member = workspace.memberships.find(
                (item) => item.userId === streamUser.id
              )?.user;
              return [
                streamUser.id,
                {
                  id: streamUser.id,
                  name: streamUser.name || member?.name || 'Member',
                  email: member?.email,
                  image:
                    typeof streamUser.image === 'string'
                      ? streamUser.image
                      : member?.image,
                  online: streamUser.online,
                  lastActive: streamUser.last_active,
                },
              ];
            })
          )
        );
      } catch {
        // Presence is optional; member profiles remain available without it.
      }
    };
    refreshPresence();
    const listener = chatClient.on((event) => {
      if (event.type === 'connection.recovered') {
        refreshPresence();
        return;
      }
      if (
        !['user.presence.changed', 'user.updated'].includes(event.type) ||
        !event.user ||
        !workspace.memberships.some((item) => item.userId === event.user?.id)
      ) {
        return;
      }
      const member = workspace.memberships.find(
        (item) => item.userId === event.user?.id
      )?.user;
      setPresenceById((current) => ({
        ...current,
        [event.user!.id]: {
          id: event.user!.id,
          name: event.user!.name || member?.name || 'Member',
          email: member?.email,
          image:
            typeof event.user!.image === 'string'
              ? event.user!.image
              : member?.image,
          online: event.user!.online,
          lastActive: event.user!.last_active,
        },
      }));
    });
    return () => {
      active = false;
      listener.unsubscribe();
    };
  }, [chatClient, workspace]);

  useEffect(() => {
    if (!workspace?.id || !chatClient?.userID || !user) return;
    let active = true;

    const toActivity = (
      message: MessageResponse,
      type: ActivityItem['type']
    ): ActivityItem | null => {
      if (!message.id || !message.cid || message.user?.id === user.id)
        return null;
      const member = workspace.memberships.find(
        (item) => item.userId === message.user?.id
      )?.user;
      return {
        id: message.id,
        cid: message.cid,
        text: message.text || 'Shared an attachment',
        createdAt: message.created_at || new Date().toISOString(),
        type,
        user: {
          id: message.user?.id || member?.id || 'unknown',
          name: message.user?.name || member?.name || 'Member',
          email: member?.email,
          image:
            typeof message.user?.image === 'string'
              ? message.user.image
              : member?.image,
          online: message.user?.online,
        },
      };
    };

    const loadActivity = async () => {
      try {
        const [mentions, unread] = await Promise.all([
          chatClient.search(
            { workspaceId: workspace.id },
            {
              mentioned_users: { $contains: user.id },
            } as unknown as Parameters<typeof chatClient.search>[1],
            { limit: 30, sort: [{ created_at: -1 }] }
          ),
          chatClient.getUnreadCount(),
        ]);
        if (!active) return;
        setActivities(
          mentions.results
            .map(({ message }) => toActivity(message, 'mention'))
            .filter((item): item is ActivityItem => Boolean(item))
        );
        setUnreadCount(unread.total_unread_count);
      } catch {
        // Real-time events still populate Activity if history is unavailable.
      }
    };
    loadActivity();

    const listener = chatClient.on((event) => {
      if (
        !['message.new', 'notification.message_new'].includes(event.type) ||
        !event.message
      ) {
        if (event.total_unread_count !== undefined) {
          setUnreadCount(event.total_unread_count);
        }
        return;
      }
      const mentioned = event.message.mentioned_users?.some(
        (mentionedUser) => mentionedUser.id === user.id
      );
      const isDm = event.channel?.isDm === true;
      if (
        event.channel?.workspaceId !== workspace.id ||
        (!mentioned && !isDm)
      ) {
        return;
      }
      const item = toActivity(event.message, mentioned ? 'mention' : 'dm');
      if (item) {
        setActivities((current) =>
          [
            item,
            ...current.filter((existing) => existing.id !== item.id),
          ].slice(0, 50)
        );
      }
      if (event.total_unread_count !== undefined) {
        setUnreadCount(event.total_unread_count);
      }
    });
    return () => {
      active = false;
      listener.unsubscribe();
    };
  }, [chatClient, user, workspace]);

  if (!chatClient || !videoClient || !user)
    return (
      <div className="client font-lato w-screen h-screen flex flex-col">
        <div className="absolute w-full h-full bg-theme-gradient" />
      </div>
    );

  return (
    <AppContext.Provider
      value={{
        workspace: workspace!,
        setWorkspace,
        otherWorkspaces,
        setOtherWorkspaces,
        channel: channel!,
        setChannel,
        loading,
        setLoading,
        chatClient,
        setChatClient,
        videoClient,
        setVideoClient,
        channelCall,
        setChannelCall,
        sidebarMode,
        setSidebarMode,
        selectedProfile,
        setSelectedProfile,
        activities,
        unreadCount,
        presenceById,
      }}
    >
      <Chat client={chatClient}>
        <StreamVideo client={videoClient}>
          <div
            className="client font-lato w-screen h-screen flex flex-col"
            style={
              {
                '--workspace-accent': workspace?.accentColor || '#4a154b',
              } as CSSProperties
            }
          >
            <div className="absolute w-full h-full bg-theme-gradient" />
            {/* Toolbar */}
            <div className="relative w-full h-10 flex items-center justify-between pr-1">
              <div className="w-[4.375rem] h-10 mr-auto flex-none" />
              {!loading && (
                <div className="flex flex-auto items-center">
                  <div className="relative hidden sm:flex flex-none basis-[24%]">
                    <div className="flex justify-start basis-full" />
                    <div className="flex justify-end basis-full mr-3">
                      <div className="flex gap-1 items-center">
                        <IconButton
                          icon={<ArrowBack color="var(--primary)" />}
                          disabled
                        />
                        <IconButton
                          icon={<ArrowForward color="var(--primary)" />}
                          disabled
                        />
                      </div>
                      <div className="flex items-center ml-1">
                        <IconButton icon={<Clock color="var(--primary)" />} />
                      </div>
                    </div>
                  </div>
                  <SearchBar placeholder={`Search ${workspace?.name}`} />
                  <div className="hidden sm:flex flex-[1_0_auto] items-center justify-end mr-1">
                    <IconButton icon={<Help color="var(--primary)" />} />
                  </div>
                </div>
              )}
            </div>
            {/* Main */}
            <div className="w-screen h-[calc(100svh-40px)] grid grid-cols-[70px_auto]">
              {/* Rail */}
              <div className="relative w-[4.375rem] flex flex-col items-center gap-3 pt-2 z-[1000] bg-transparent">
                {!loading && (
                  <>
                    <WorkspaceSwitcher />
                    <div className="relative flex flex-col items-center w-[3.25rem]">
                      <RailButton
                        title="Home"
                        icon={<Home color="var(--primary)" filled />}
                        active={sidebarMode === 'channels'}
                        onClick={() => setSidebarMode('channels')}
                      />
                      <RailButton
                        title="DMs"
                        icon={<Messages color="var(--primary)" />}
                        active={sidebarMode === 'dms'}
                        onClick={() => setSidebarMode('dms')}
                      />
                      <RailButton
                        title="Activity"
                        icon={<Notifications color="var(--primary)" />}
                        active={sidebarMode === 'activity'}
                        badge={unreadCount}
                        onClick={() => setSidebarMode('activity')}
                      />
                      <RailButton
                        title="Later"
                        icon={<Bookmark color="var(--primary)" />}
                      />
                      <RailButton
                        title="More"
                        icon={<MoreHoriz color="var(--primary)" />}
                      />
                    </div>
                    <div className="flex flex-col items-center gap-4 mt-auto pb-6 w-full">
                      <div className="cursor-pointer flex items-center justify-center w-9 h-9 rounded-full bg-[#565759]">
                        <Plus color="var(--primary)" />
                      </div>
                      <div className="relative h-9 w-9">
                        <button
                          type="button"
                          className="absolute inset-0 z-10"
                          aria-label="Open profile and settings"
                          title="Profile and settings"
                          onClick={() =>
                            setSelectedProfile(presenceById[user.id] || user)
                          }
                        />
                        <div className="absolute left-0 top-0 flex items-center justify-center pointer-events-none">
                          <div className="relative w-full h-full">
                            <Avatar
                              width={36}
                              borderRadius={8}
                              fontSize={20}
                              fontWeight={700}
                              data={{
                                name: user.name,
                                image: user.image || undefined,
                              }}
                            />
                            <span className="absolute w-3.5 h-3.5 rounded-full flex items-center justify-center -bottom-[3px] -right-[3px] bg-[#111215]">
                              <div
                                className={`w-[8.5px] h-[8.5px] rounded-full ${
                                  presenceById[user.id]?.online === true
                                    ? 'bg-[#3daa7c]'
                                    : 'border border-[#777a80]'
                                }`}
                              />
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>
                  </>
                )}
              </div>
              <WorkspaceLayout>{children}</WorkspaceLayout>
            </div>
            <UserSettingsModal
              open={settingsOpen}
              user={user}
              onClose={() => setSettingsOpen(false)}
              onSignOut={() =>
                signOut({
                  fetchOptions: {
                    onSuccess: () => location.assign('/sign-in'),
                  },
                })
              }
            />
            <ProfileView
              user={
                selectedProfile
                  ? presenceById[selectedProfile.id] || selectedProfile
                  : null
              }
              currentUserId={user.id}
              workspaceId={workspace?.id}
              onClose={() => setSelectedProfile(null)}
              onEdit={() => {
                setSelectedProfile(null);
                setSettingsOpen(true);
              }}
            />
          </div>
        </StreamVideo>
      </Chat>
    </AppContext.Provider>
  );
};

export default Layout;
