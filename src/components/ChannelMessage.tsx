import { useContext, useEffect, useMemo, useRef, useState } from 'react';
import {
  Attachment,
  MessageText,
  renderText,
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

const ChannelMessage = () => {
  const { message, handleOpenThread, threadList } = useMessageContext();
  const { channel } = useChannelStateContext('ChannelMessage');
  const { data: session } = useSession();
  const { workspace, setSelectedProfile, presenceById } =
    useContext(AppContext);
  const user = session?.user;
  const isMentioned = message.mentioned_users?.some(
    (mentionedUser) => mentionedUser.id === user?.id
  );
  const [pinning, setPinning] = useState(false);
  const messageRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (location.hash === `#message-${encodeURIComponent(message.id)}`) {
      messageRef.current?.scrollIntoView({ block: 'center' });
    }
  }, [message.id]);

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
                      {/* Message Actions */}
                      <div className="z-20 hidden group-hover/attachment:inline-flex absolute top-2 right-2">
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
            onClick={handleOpenThread}
            disabled={threadList}
            title="Reply in thread"
            className="group/button rounded flex w-8 h-8 items-center justify-center hover:bg-[#d1d2d30b] disabled:hidden"
          >
            <Threads className="fill-[#e8e8e8b3] group-hover/button:fill-channel-gray" />
          </button>
          <button className="group/button rounded flex w-8 h-8 items-center justify-center hover:bg-[#d1d2d30b]">
            <Share className="fill-[#e8e8e8b3] group-hover/button:fill-channel-gray" />
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
};

export default ChannelMessage;
