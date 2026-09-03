'use client';

import { useEffect, useState } from 'react';
import type { Channel, MessageResponse } from 'stream-chat';
import type { DefaultStreamChatGenerics } from 'stream-chat-react';

import Avatar from './Avatar';
import Pin from './icons/Pin';

type PinnedMessage = MessageResponse<DefaultStreamChatGenerics>;

const PinnedMessages = ({
  channel,
}: {
  channel: Channel<DefaultStreamChatGenerics>;
}) => {
  const [messages, setMessages] = useState<PinnedMessage[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let active = true;
    const load = async () => {
      try {
        const response = await channel.getPinnedMessages({ limit: 50 }, [
          { pinned_at: -1 },
        ]);
        if (active) {
          setMessages(response.messages);
          setError('');
        }
      } catch {
        if (active) setError('Unable to load pinned messages.');
      } finally {
        if (active) setLoading(false);
      }
    };
    load();
    const listener = channel.on('message.updated', load);
    return () => {
      active = false;
      listener.unsubscribe();
    };
  }, [channel]);

  if (loading) {
    return <div className="p-6 text-sm text-[#ababad]">Loading pins...</div>;
  }

  if (error) {
    return <div className="p-6 text-sm text-[#ff9b9b]">{error}</div>;
  }

  if (!messages.length) {
    return (
      <div className="h-full flex flex-col items-center justify-center px-8 text-center">
        <span className="mb-3 flex h-12 w-12 items-center justify-center rounded-xl bg-[#25272b]">
          <Pin size={22} className="fill-[#b9babd]" />
        </span>
        <h2 className="font-bold text-white">No pinned messages yet</h2>
        <p className="mt-1 max-w-sm text-sm text-[#ababad]">
          Pin important decisions and links from the message actions menu.
        </p>
      </div>
    );
  }

  return (
    <div className="h-full overflow-y-auto px-5 py-4">
      <h2 className="mb-3 text-sm font-bold text-white">Pinned messages</h2>
      <div className="flex flex-col gap-2">
        {messages.map((message) => (
          <article
            key={message.id}
            className="flex gap-3 rounded-lg border border-[#797c814d] bg-[#202328] p-3"
          >
            <Avatar
              width={32}
              borderRadius={7}
              fontSize={14}
              data={{
                name: message.user?.name || 'Member',
                image: message.user?.image,
              }}
            />
            <div className="min-w-0 flex-1">
              <div className="flex items-baseline gap-2">
                <span className="text-sm font-bold text-white">
                  {message.user?.name || 'Member'}
                </span>
                <time className="text-xs text-[#ababad]">
                  {message.pinned_at
                    ? new Date(message.pinned_at).toLocaleDateString()
                    : ''}
                </time>
              </div>
              <p className="mt-1 whitespace-pre-wrap break-words text-sm text-[#d1d2d3]">
                {message.text || 'Attachment'}
              </p>
            </div>
            <button
              type="button"
              title="Unpin message"
              onClick={() => channel.getClient().unpinMessage(message.id)}
              className="h-8 w-8 shrink-0 rounded-md hover:bg-hover-gray"
            >
              <Pin size={16} className="mx-auto fill-[#b9babd]" />
            </button>
          </article>
        ))}
      </div>
    </div>
  );
};

export default PinnedMessages;
