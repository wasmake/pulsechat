'use client';

import { createPortal } from 'react-dom';
import { useEffect, useRef, useState } from 'react';

export type GifResult = {
  id: string;
  slug: string;
  title: string;
  previewUrl: string;
  url: string;
  width: number;
  height: number;
  query: string;
};

const GifPicker = ({
  onSelect,
}: {
  onSelect: (gif: GifResult) => Promise<void>;
}) => {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [gifs, setGifs] = useState<GifResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const panel = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setOpen(false);
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const controller = new AbortController();
    const timer = window.setTimeout(
      async () => {
        setLoading(true);
        setError('');
        try {
          const response = await fetch(
            `/api/gifs?query=${encodeURIComponent(query)}`,
            {
              signal: controller.signal,
            }
          );
          const body = await response.json();
          if (!response.ok)
            throw new Error(body.error || 'Unable to load GIFs');
          setGifs(body.gifs);
        } catch (requestError) {
          if (!controller.signal.aborted) {
            setGifs([]);
            setError(
              requestError instanceof Error
                ? requestError.message
                : 'Unable to load GIFs'
            );
          }
        } finally {
          if (!controller.signal.aborted) setLoading(false);
        }
      },
      query ? 250 : 0
    );
    return () => {
      controller.abort();
      window.clearTimeout(timer);
    };
  }, [open, query]);

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="mx-0.5 h-7 rounded px-1.5 text-[11px] font-black text-[#b9babd] hover:bg-[#d1d2d30b] hover:text-white"
      >
        GIF
      </button>
      {open &&
        createPortal(
          <div
            className="fixed inset-0 z-[12000] bg-black/30"
            onMouseDown={(event) => {
              if (!panel.current?.contains(event.target as Node))
                setOpen(false);
            }}
          >
            <div
              ref={panel}
              role="dialog"
              aria-label="Choose a GIF"
              className="absolute bottom-20 right-3 flex max-h-[min(620px,calc(100vh-100px))] w-[min(520px,calc(100vw-24px))] flex-col overflow-hidden rounded-xl border border-[#797c814d] bg-[#111318] shadow-2xl sm:right-6"
            >
              <div className="border-b border-[#797c814d] p-3">
                <div className="flex items-center justify-between">
                  <h2 className="text-base font-black text-white">
                    Choose a GIF
                  </h2>
                  <button
                    type="button"
                    onClick={() => setOpen(false)}
                    className="rounded px-2 py-1 text-sm text-[#b9babd] hover:bg-hover-gray hover:text-white"
                  >
                    Close
                  </button>
                </div>
                <input
                  autoFocus
                  type="search"
                  value={query}
                  onChange={(event) => setQuery(event.target.value)}
                  placeholder="Search KLIPY"
                  className="mt-3 h-10 w-full rounded-md border border-[#797c814d] bg-[#1a1d21] px-3 text-sm text-white outline-none focus:border-[#1d9bd1]"
                />
              </div>
              <div className="min-h-52 overflow-y-auto p-2">
                {!query && !loading && !error && (
                  <p className="px-1 pb-2 text-xs font-bold uppercase tracking-wide text-[#ababad]">
                    Trending GIFs
                  </p>
                )}
                {loading && !gifs.length && (
                  <p className="p-8 text-center text-sm text-[#ababad]">
                    Loading GIFs...
                  </p>
                )}
                {error && (
                  <div className="p-8 text-center">
                    <p className="text-sm text-[#ff9b9b]">{error}</p>
                    <p className="mt-2 text-xs text-[#ababad]">
                      You can still type <strong>/giphy search terms</strong> in
                      the message box.
                    </p>
                  </div>
                )}
                {!loading && !error && !gifs.length && (
                  <p className="p-8 text-center text-sm text-[#ababad]">
                    No GIFs found.
                  </p>
                )}
                <div className="grid grid-cols-2 gap-1.5 sm:grid-cols-3">
                  {gifs.map((gif) => (
                    <button
                      type="button"
                      key={gif.id}
                      title={gif.title}
                      onClick={async () => {
                        try {
                          await onSelect(gif);
                          setOpen(false);
                        } catch {
                          // The composer displays the send error.
                        }
                      }}
                      className="group relative min-h-24 overflow-hidden rounded-md bg-[#22252a] focus:outline-none focus:ring-2 focus:ring-[#1d9bd1]"
                    >
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={gif.previewUrl}
                        alt={gif.title}
                        className="h-full w-full object-cover transition-transform group-hover:scale-105"
                      />
                      <span className="absolute inset-x-0 bottom-0 truncate bg-gradient-to-t from-black/80 px-2 pb-1 pt-5 text-left text-[10px] font-bold text-white opacity-0 group-hover:opacity-100">
                        {gif.title}
                      </span>
                    </button>
                  ))}
                </div>
              </div>
              <div className="border-t border-[#797c814d] px-3 py-2 text-right text-[10px] font-bold text-[#777a80]">
                POWERED BY KLIPY
              </div>
            </div>
          </div>,
          document.body
        )}
    </>
  );
};

export default GifPicker;
