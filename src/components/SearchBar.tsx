'use client';

import { FormEvent, useContext, useEffect, useRef, useState } from 'react';
import type { MessageResponse } from 'stream-chat';
import { useRouter } from 'next/navigation';

import { AppContext } from '@/app/client/layout';
import Search from './icons/Search';
import Avatar from './Avatar';

interface SearchBarProps {
  placeholder: string;
}

const SearchBar = ({ placeholder }: SearchBarProps) => {
  const { chatClient, workspace } = useContext(AppContext);
  const router = useRouter();
  const input = useRef<HTMLInputElement>(null);
  const root = useRef<HTMLDivElement>(null);
  const [search, setSearch] = useState('');
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState<MessageResponse[]>([]);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'k') {
        event.preventDefault();
        setOpen(true);
        input.current?.focus();
      }
      if (event.key === 'Escape') setOpen(false);
    };
    const onPointerDown = (event: PointerEvent) => {
      if (!root.current?.contains(event.target as Node)) setOpen(false);
    };
    window.addEventListener('keydown', onKeyDown);
    window.addEventListener('pointerdown', onPointerDown);
    return () => {
      window.removeEventListener('keydown', onKeyDown);
      window.removeEventListener('pointerdown', onPointerDown);
    };
  }, []);

  useEffect(() => {
    const query = search.trim();
    if (query.length < 2 || !workspace?.id) {
      setResults([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    const timer = window.setTimeout(async () => {
      try {
        const response = await chatClient.search(
          { workspaceId: workspace.id },
          query,
          { limit: 20, sort: [{ created_at: -1 }] }
        );
        setResults(response.results.map(({ message }) => message));
      } catch {
        setResults([]);
      } finally {
        setLoading(false);
      }
    }, 250);
    return () => window.clearTimeout(timer);
  }, [chatClient, search, workspace?.id]);

  const openResult = async (message: MessageResponse) => {
    const [channel] = await chatClient.queryChannels(
      { cid: message.cid },
      {},
      { limit: 1 }
    );
    if (!channel) return;
    const isDm = channel.data?.isDm === true;
    const dmUserIds = channel.data?.dmUserIds as string[] | undefined;
    const dmUserId = dmUserIds?.find((id) => id !== chatClient.userID);
    const routeId = isDm
      ? dmUserId
        ? `dm-${dmUserId}`
        : undefined
      : channel.id;
    if (!routeId) return;
    setOpen(false);
    setSearch('');
    router.push(
      `/client/${workspace.id}/${routeId}#message-${encodeURIComponent(message.id)}`
    );
  };

  const submit = (event: FormEvent) => {
    event.preventDefault();
    if (results[0]) openResult(results[0]);
  };

  return (
    <div
      ref={root}
      className="relative flex-[2_1_0] min-w-[12rem] max-w-[62.5rem]"
    >
      <form
        onSubmit={submit}
        onClick={() => {
          setOpen(true);
          input.current?.focus();
        }}
        className="flex w-full cursor-text items-center h-7 px-2 rounded-md bg-[#f8f8f840] ring-white/0 focus-within:bg-[#1a1d21] focus-within:ring-1 focus-within:ring-white/50"
      >
        <Search size={15} color="var(--primary)" />
        <input
          ref={input}
          type="search"
          name="search"
          value={search}
          onFocus={() => setOpen(true)}
          onChange={(event) => setSearch(event.target.value)}
          placeholder={placeholder}
          autoComplete="off"
          className="h-full min-w-0 flex-1 bg-transparent px-2 outline-none text-white text-[13px] placeholder:text-white"
          maxLength={100}
          aria-label={placeholder}
        />
        <kbd className="hidden rounded bg-white/10 px-1.5 py-0.5 text-[10px] text-white/70 md:block">
          {typeof navigator !== 'undefined' &&
          navigator.platform.includes('Mac')
            ? '⌘'
            : 'Ctrl'}{' '}
          K
        </kbd>
      </form>
      {open && (
        <div className="absolute left-0 right-0 top-9 z-[10000] max-h-[min(32rem,70vh)] overflow-y-auto rounded-lg border border-[#797c814d] bg-[#1a1d21] p-2 shadow-2xl">
          {!search.trim() && (
            <div className="px-3 py-4 text-sm text-[#b9babd]">
              Search messages across {workspace?.name}. Type at least two
              characters.
            </div>
          )}
          {search.trim().length === 1 && (
            <div className="px-3 py-4 text-sm text-[#b9babd]">
              Keep typing to search.
            </div>
          )}
          {loading && (
            <div className="px-3 py-4 text-sm text-[#b9babd]">Searching...</div>
          )}
          {!loading && search.trim().length >= 2 && results.length === 0 && (
            <div className="px-3 py-4 text-sm text-[#b9babd]">
              No messages found.
            </div>
          )}
          {!loading &&
            results.map((message) => (
              <button
                type="button"
                key={message.id}
                onClick={() => openResult(message)}
                className="flex w-full gap-3 rounded-md px-3 py-2 text-left hover:bg-hover-gray focus:bg-hover-gray focus:outline-none"
              >
                <Avatar
                  width={30}
                  borderRadius={7}
                  fontSize={13}
                  data={{
                    name: message.user?.name || 'Member',
                    image:
                      typeof message.user?.image === 'string'
                        ? message.user.image
                        : undefined,
                  }}
                />
                <span className="min-w-0 flex-1">
                  <span className="flex items-baseline gap-2">
                    <strong className="truncate text-sm text-white">
                      {message.user?.name || 'Member'}
                    </strong>
                    <time className="text-xs text-[#777a80]">
                      {message.created_at
                        ? new Date(message.created_at).toLocaleDateString()
                        : ''}
                    </time>
                  </span>
                  <span className="block truncate text-sm text-[#d1d2d3]">
                    {message.text || 'Attachment'}
                  </span>
                </span>
              </button>
            ))}
        </div>
      )}
    </div>
  );
};

export default SearchBar;
