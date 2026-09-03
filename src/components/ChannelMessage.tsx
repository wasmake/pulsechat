import { useContext, useEffect, useMemo, useRef, useState } from 'react';
import {
  Attachment,
  MessageText,
  renderText,
  useChannelActionContext,
  useChannelStateContext,
  useMessageContext,
} from 'stream-chat-react';
import clsx from 'clsx';
import emojiData from '@emoji-mart/data';

import AddReaction from './icons/AddReaction';
import Avatar from './Avatar';
import Download from './icons/Download';
import EmojiPicker from './EmojiPicker';
import MoreVert from './icons/MoreVert';
import Share from './icons/Share';
import Threads from './icons/Threads';
import Pin from './icons/Pin';
import { AppContext } from '@/app/client/layout';
import { useSession } from '@/lib/auth-client';
import GifFavoriteButton from './GifFavoriteButton';
import type { GifResult } from './GifPicker';

const ChannelMessage = () => {
  const { message, handleOpenThread, threadList } = useMessageContext();
  const { channel } = useChannelStateContext('ChannelMessage');
  const { setQuotedMessage } = useChannelActionContext('ChannelMessage');
  const { data: session } = useSession();
  const { workspace, setSelectedProfile, presenceById } =
    useContext(AppContext);
  const user = session?.user;
  const isMentioned = message.mentioned_users?.some(
    (mentionedUser) => mentionedUser.id === user?.id
  );
  const [pinning, setPinning] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const messageRef = useRef<HTMLDivElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const isAuthor = message.user?.id === user?.id;

  useEffect(() => {
    if (location.hash === `#message-${encodeURIComponent(message.id)}`) {
      messageRef.current?.scrollIntoView({ block: 'center' });
    }
  }, [message.id]);

  useEffect(() => {
    if (!menuOpen) return;
    const closeMenu = (event: MouseEvent) => {
      if (!menuRef.current?.contains(event.target as Node)) setMenuOpen(false);
    };
    window.addEventListener('mousedown', closeMenu);
    return () => window.removeEventListener('mousedown', closeMenu);
  }, [menuOpen]);

  const reactionCounts = useMemo(() => {
    if (!message.reaction_groups) {
      return [];
    }
    return Object.entries(
      Object.entries(message.reaction_groups!)
        ?.sort(
          (a, b) =>
            new Date(a[1].first_reaction_at!).getTime() -
            new Date(b[1].first_reaction_at!).getTime()
        )
        .reduce(
          (acc, entry) => {
            const [type, event] = entry;
            acc[type] = acc[type] || { count: 0, reacted: false };
            acc[type].count = event.count;
            if (
              message.own_reactions?.some(
                (reaction) =>
                  reaction.type === type && reaction.user_id === user?.id
              )
            ) {
              acc[type].reacted = true;
            }
            return acc;
          },
          {} as Record<string, { count: number; reacted: boolean }>
        )
    );
  }, [message.reaction_groups, message.own_reactions, user]);

  const createdAt = new Date(message.created_at!).toLocaleTimeString('en-US', {
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  });

  const downloadFile = async (url: string) => {
    const link = document.createElement('a');
    link.href = url;
    link.download = url.split('/').pop()!;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleReaction = async (e: { id: string; native?: string }) => {
    await channel.sendReaction(message.id, { type: e.id });
  };

  const removeReaction = async (reactionType: string) => {
    await channel.deleteReaction(message.id, reactionType);
  };

  const handleReactionClick = async (
    reactionType: string,
    isActive: boolean
  ) => {
    if (isActive) {
      removeReaction(reactionType);
    } else {
      handleReaction({ id: reactionType });
    }
  };

  const getReactionEmoji = (reactionType: string) => {
    const data = emojiData as {
      emojis: {
        [key: string]: { skins: { native: string }[] };
      };
    };
    const emoji = data.emojis[reactionType];
    if (emoji) return emoji.skins[0].native;
    return null;
  };

  const togglePin = async () => {
    if (!message.id || pinning) return;
    setPinning(true);
    try {
      if (message.pinned_at) {
        await channel.getClient().unpinMessage(message.id);
      } else {
        await channel.getClient().pinMessage(message.id);
      }
    } finally {
      setPinning(false);
    }
  };

  const openProfile = () => {
    if (!message.user?.id) return;
    const member = workspace.memberships.find(
      (item) => item.userId === message.user?.id
    )?.user;
    setSelectedProfile({
      ...presenceById[message.user.id],
      id: message.user.id,
      name:
        presenceById[message.user.id]?.name ||
        message.user.name ||
        member?.name ||
        'Member',
      email: member?.email,
      image:
        presenceById[message.user.id]?.image ||
        (typeof message.user.image === 'string'
          ? message.user.image
          : member?.image),
      online: presenceById[message.user.id]?.online ?? message.user.online,
      lastActive: presenceById[message.user.id]?.lastActive,
    });
  };

  const deleteMessage = async () => {
    if (!isAuthor || deleting || !message.id) return;
    if (!window.confirm('Delete this message?')) return;
    setDeleting(true);
    try {
      await channel.getClient().deleteMessage(message.id);
      setMenuOpen(false);
    } finally {
      setDeleting(false);
    }
  };

  const getGif = (attachment: Record<string, unknown>): GifResult | null => {
    const imageUrl = attachment.image_url;
    if (typeof imageUrl !== 'string') return null;
    try {
      if (
        !['static.klipy.com', 'static.klipy.co', 'static2.klipy.com'].includes(
          new URL(imageUrl).hostname
        )
      ) {
        return null;
      }
    } catch {
      return null;
    }
    const metadataId = attachment.klipy_id;
    let hash = 0;
    for (let index = 0; index < imageUrl.length; index += 1) {
      hash = (hash * 31 + imageUrl.charCodeAt(index)) | 0;
    }
    return {
      id:
        typeof metadataId === 'string'
          ? metadataId
          : `shared-${Math.abs(hash).toString(36)}`,
      slug:
        typeof attachment.klipy_slug === 'string'
          ? attachment.klipy_slug
          : 'shared',
      title:
        typeof attachment.title === 'string' ? attachment.title : 'Shared GIF',
      previewUrl:
        typeof attachment.klipy_preview_url === 'string'
          ? attachment.klipy_preview_url
          : imageUrl,
      url: imageUrl,
      width:
        typeof attachment.klipy_width === 'number'
          ? attachment.klipy_width
          : 200,
      height:
        typeof attachment.klipy_height === 'number'
          ? attachment.klipy_height
          : 200,
      query: '',
    };
  };

  return (
    <div
      ref={messageRef}
      id={`message-${message.id}`}
      className={clsx(
        'relative flex border-l-[3px] border-l-transparent py-2 pl-[17px] pr-10 group/message hover:bg-[#22252a] target:bg-[#3b3151]',
        isMentioned && 'border-l-[#a87ddb] bg-[#2b213d] hover:bg-[#322744]'
      )}
    >
      {/* Image */}
      <div className="flex shrink-0 mr-2">
        <span className="w-fit h-fit inline-flex">
          <button
            type="button"
            onClick={openProfile}
            className="w-9 h-9 shrink-0 inline-block"
            aria-label={`View ${message.user?.name || 'member'} profile`}
          >
            <span className="w-full h-full overflow-hidden">
              <Avatar
                width={36}
                borderRadius={8}
                fontSize={15}
                data={{
                  name: message.user?.name || 'Member',
                  image:
                    typeof message.user?.image === 'string'
                      ? message.user.image
                      : undefined,
                }}
              />
            </span>
          </button>
        </span>
      </div>
      {/* Details */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={openProfile}
            className="cursor-pointer text-[15px] leading-[1.46668] font-[900] text-white hover:underline"
          >
            {message.user?.name}
          </button>
          <span className="pt-1 cursor-pointer text-xs leading-[1.46668] text-[#ABABAD] hover:underline">
            {createdAt}
          </span>
        </div>
        <div className="mb-1">
          <div className="w-full">
            <div className="flex flex-col max-w-[245px] sm:max-w-full">
              {message.quoted_message && (
                <a
                  href={`#message-${encodeURIComponent(message.quoted_message.id)}`}
                  className="mb-1 flex max-w-xl items-center gap-2 overflow-hidden border-l-2 border-[#5865f2] pl-2 text-xs !text-[#b5bac1] hover:!text-[#dbdee1]"
                >
                  <span className="shrink-0 font-bold text-[#f2f3f5]">
                    @{message.quoted_message.user?.name || 'member'}
                  </span>
                  <span className="truncate">
                    {message.quoted_message.text ||
                      (message.quoted_message.attachments?.length
                        ? 'Attachment'
                        : 'Message')}
                  </span>
                </a>
              )}
              <MessageText
                renderText={(text, mentionedUsers) =>
                  renderText(text, mentionedUsers, {
                    customMarkDownRenderers: {
                      br: () => <span className="paragraph_break block h-2" />,
                    },
                  })
                }
              />
              <div
                className={clsx(
                  message.attachments && message.attachments.length > 0
                    ? 'flex'
                    : 'hidden',
                  'mt-3 flex-col gap-2'
                )}
              >
                {message.attachments?.map((attachment) => {
                  const gif = getGif(
                    attachment as unknown as Record<string, unknown>
                  );
                  if (attachment.type === 'giphy') {
                    return (
                      <Attachment
                        key={attachment.id || attachment.title}
                        attachments={[attachment]}
                      />
                    );
                  }
                  return (
                    <div
                      key={
                        attachment?.id ||
                        attachment.image_url ||
                        attachment.asset_url
                      }
                      className={clsx(
                        'group/attachment relative cursor-pointer flex items-center rounded-xl gap-3 border border-[#d6d6d621] bg-[#1a1d21]',
                        attachment?.image_url && !attachment.asset_url
                          ? 'max-w-[360px] p-0'
                          : 'max-w-[426px] p-3'
                      )}
                    >
                      {attachment.asset_url && (
                        <>
                          <Avatar
                            width={32}
                            borderRadius={8}
                            data={{
                              name: attachment!.title!,
                              image: attachment!.image_url!,
                            }}
                          />
                          <div className="flex flex-col gap-0.5">
                            <p className="text-sm text-[#d1d2d3] break-all whitespace-break-spaces line-clamp-1 mr-2">
                              {attachment.title || `attachment`}
                            </p>
                            <p className="text-[13px] text-[#ababad] break-all whitespace-break-spaces line-clamp-1">
                              {attachment.type}
                            </p>
                          </div>
                        </>
                      )}
                      {attachment.image_url && !attachment.asset_url && (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={attachment.image_url}
                          alt="attachment"
                          className="w-full max-h-[358px] aspect-auto rounded-lg"
                        />
                      )}
                      {gif && (
                        <div className="absolute right-2 top-2 z-30">
                          <GifFavoriteButton gif={gif} />
                        </div>
                      )}
                      {/* Message Actions */}
                      <div
                        className={clsx(
                          'z-20 hidden group-hover/attachment:inline-flex absolute top-2',
                          gif ? 'right-11' : 'right-2'
                        )}
                      >
                        <div className="flex p-0.5 rounded-md ml-2 bg-[#1a1d21] border border-[#797c814d]">
                          <button
                            onClick={() =>
                              downloadFile(
                                attachment.asset_url! || attachment.image_url!
                              )
                            }
                            className="group/button rounded flex w-8 h-8 items-center justify-center hover:bg-[#d1d2d30b]"
                          >
                            <Download className="fill-[#e8e8e8b3] group-hover/button:fill-channel-gray" />
                          </button>
                          <button className="group/button rounded flex w-8 h-8 items-center justify-center hover:bg-[#d1d2d30b]">
                            <Share className="fill-[#e8e8e8b3] group-hover/button:fill-channel-gray" />
                          </button>
                          <button className="group/button rounded flex w-8 h-8 items-center justify-center hover:bg-[#d1d2d30b]">
                            <MoreVert
                              size={18}
                              className="fill-[#e8e8e8b3] group-hover/button:fill-channel-gray"
                            />
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
              {reactionCounts.length > 0 && (
                <div className="flex items-center gap-1 flex-wrap mt-2">
                  {reactionCounts.map(([reactionType, data], index) => (
                    <button
                      key={index}
                      onClick={() =>
                        handleReactionClick(reactionType, data.reacted)
                      }
                      className={`px-2 mb-1 h-6 flex items-center gap-1 border text-white text-[11.8px] rounded-full transition-colors ${
                        data.reacted
                          ? 'bg-[#004d76] border-[#004d76]'
                          : 'bg-[#f8f8f80f] border-[#f8f8f80f]'
                      }`}
                    >
                      <span className="emoji text-[14.5px]">
                        {getReactionEmoji(reactionType)}
                      </span>{' '}
                      {data.count}
                    </button>
                  ))}
                  <EmojiPicker
                    ButtonIconComponent={AddReaction}
                    wrapperClassName="group/button relative mb-1 rounded-full bg-[#f8f8f80f] flex w-8 h-6 items-center justify-center hover:bg-[#d1d2d30b]"
                    buttonClassName="fill-[#e8e8e8b3] group-hover/button:fill-channel-gray"
                    onEmojiSelect={handleReaction}
                  />
                </div>
              )}
              {!threadList && Boolean(message.reply_count) && (
                <button
                  type="button"
                  onClick={handleOpenThread}
                  className="mt-1 w-fit text-xs font-bold text-[#1d9bd1] hover:underline"
                >
                  {message.reply_count}{' '}
                  {message.reply_count === 1 ? 'reply' : 'replies'}
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
      {/* Message Actions */}
      <div className="z-20 hidden group-hover/message:inline-flex absolute -top-4 right-[38px]">
        <div className="flex p-0.5 rounded-md ml-2 bg-[#1a1d21] border border-[#797c814d]">
          <EmojiPicker
            ButtonIconComponent={AddReaction}
            wrapperClassName="group/button relative rounded flex w-8 h-8 items-center justify-center hover:bg-[#d1d2d30b]"
            buttonClassName="fill-[#e8e8e8b3] group-hover/button:fill-channel-gray"
            onEmojiSelect={handleReaction}
          />
          <button
            type="button"
            onClick={() => setQuotedMessage(message)}
            disabled={threadList}
            title="Reply"
            className="group/button rounded flex w-8 h-8 items-center justify-center hover:bg-[#d1d2d30b] disabled:hidden"
          >
            <Share className="fill-[#e8e8e8b3] group-hover/button:fill-channel-gray" />
          </button>
          <button
            type="button"
            onClick={handleOpenThread}
            disabled={threadList}
            title="Reply in thread"
            className="group/button rounded flex w-8 h-8 items-center justify-center hover:bg-[#d1d2d30b] disabled:hidden"
          >
            <Threads className="fill-[#e8e8e8b3] group-hover/button:fill-channel-gray" />
          </button>
          <button
            type="button"
            onClick={togglePin}
            disabled={pinning}
            title={message.pinned_at ? 'Unpin message' : 'Pin message'}
            className={clsx(
              'group/button rounded flex w-8 h-8 items-center justify-center hover:bg-[#d1d2d30b]',
              message.pinned_at && 'bg-[#1264a3]'
            )}
          >
            <Pin
              size={18}
              className="fill-[#e8e8e8b3] group-hover/button:fill-channel-gray"
            />
          </button>
          <button
            type="button"
            onClick={() => setMenuOpen((open) => !open)}
            aria-expanded={menuOpen}
            aria-label="More message actions"
            className="group/button rounded flex w-8 h-8 items-center justify-center hover:bg-[#d1d2d30b]"
          >
            <MoreVert
              size={18}
              className="fill-[#e8e8e8b3] group-hover/button:fill-channel-gray"
            />
          </button>
        </div>
      </div>
      {menuOpen && (
        <div
          ref={menuRef}
          className="absolute right-9 top-7 z-50 min-w-44 rounded-md border border-[#111214] bg-[#111214] p-1.5 text-sm text-[#dbdee1] shadow-2xl"
        >
          <button
            type="button"
            onClick={() => {
              navigator.clipboard.writeText(
                `${location.origin}${location.pathname}#message-${encodeURIComponent(message.id)}`
              );
              setMenuOpen(false);
            }}
            className="w-full rounded px-2 py-2 text-left hover:bg-[#4752c4] hover:text-white"
          >
            Copy message link
          </button>
          {isAuthor && (
            <button
              type="button"
              onClick={deleteMessage}
              disabled={deleting}
              className="w-full rounded px-2 py-2 text-left text-[#f23f42] hover:bg-[#da373c] hover:text-white disabled:opacity-60"
            >
              {deleting ? 'Deleting...' : 'Delete message'}
            </button>
          )}
        </div>
      )}
    </div>
  );
};

export default ChannelMessage;
