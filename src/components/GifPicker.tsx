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
  const [favorites, setFavorites] = useState<GifResult[]>([]);
  const [tab, setTab] = useState<'gifs' | 'favorites'>('gifs');
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
    fetch('/api/gifs/favorites')
      .then(async (response) => {
        const body = await response.json();
        if (response.ok) setFavorites(body.gifs);
      })
      .catch(() => undefined);
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

  const toggleFavorite = async (gif: GifResult) => {
    const isFavorite = favorites.some((item) => item.id === gif.id);
    setFavorites((current) =>
      isFavorite
        ? current.filter((item) => item.id !== gif.id)
        : [gif, ...current]
    );
    const response = await fetch(
      isFavorite
        ? `/api/gifs/favorites/${encodeURIComponent(gif.id)}`
        : '/api/gifs/favorites',
      {
        method: isFavorite ? 'DELETE' : 'POST',
        headers: isFavorite
          ? undefined
          : { 'Content-Type': 'application/json' },
        body: isFavorite ? undefined : JSON.stringify(gif),
      }
    );
    if (!response.ok) {
      setFavorites((current) =>
        isFavorite
          ? [gif, ...current]
          : current.filter((item) => item.id !== gif.id)
      );
    }
  };

  const displayedGifs = tab === 'favorites' ? favorites : gifs;

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
                <div className="mt-3 flex gap-1 border-b border-[#797c814d]">
                  <button
                    type="button"
                    onClick={() => setTab('gifs')}
                    className={`px-3 py-2 text-xs font-bold ${
                      tab === 'gifs'
                        ? 'border-b-2 border-white text-white'
                        : 'text-[#ababad]'
                    }`}
                  >
                    GIFs
                  </button>
                  <button
                    type="button"
                    onClick={() => setTab('favorites')}
                    className={`px-3 py-2 text-xs font-bold ${
                      tab === 'favorites'
                        ? 'border-b-2 border-white text-white'
                        : 'text-[#ababad]'
                    }`}
                  >
                    Favorites {favorites.length ? `(${favorites.length})` : ''}
                  </button>
                </div>
                {tab === 'gifs' && (
                  <input
                    autoFocus
                    type="search"
                    value={query}
                    onChange={(event) => setQuery(event.target.value)}
                    placeholder="Search KLIPY"
                    className="mt-3 h-10 w-full rounded-md border border-[#797c814d] bg-[#1a1d21] px-3 text-sm text-white outline-none focus:border-[#1d9bd1]"
                  />
                )}
              </div>
              <div className="min-h-52 overflow-y-auto p-2">
                {tab === 'gifs' && !query && !loading && !error && (
                  <p className="px-1 pb-2 text-xs font-bold uppercase tracking-wide text-[#ababad]">
                    Trending GIFs
                  </p>
                )}
                {tab === 'gifs' && loading && !gifs.length && (
                  <p className="p-8 text-center text-sm text-[#ababad]">
                    Loading GIFs...
                  </p>
                )}
                {error && (
                  <div className="p-8 text-center">
                    <p className="text-sm text-[#ff9b9b]">{error}</p>
                  </div>
                )}
                {tab === 'gifs' && !loading && !error && !gifs.length && (
                  <p className="p-8 text-center text-sm text-[#ababad]">
                    No GIFs found.
                  </p>
                )}
                {tab === 'favorites' && !favorites.length && (
                  <p className="p-8 text-center text-sm text-[#ababad]">
                    Hover over a GIF and select the heart to save it here.
                  </p>
                )}
                <div className="grid grid-cols-2 gap-1.5 sm:grid-cols-3">
                  {displayedGifs.map((gif) => (
                    <div
                      key={gif.id}
                      className="group relative min-h-24 overflow-hidden rounded-md bg-[#22252a]"
                    >
                      <button
                        type="button"
                        title={gif.title}
                        onClick={async () => {
                          try {
                            await onSelect(gif);
                            setOpen(false);
                          } catch {
                            // The composer displays the send error.
                          }
                        }}
                        className="h-full w-full focus:outline-none focus:ring-2 focus:ring-[#1d9bd1]"
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
                      <button
                        type="button"
                        aria-label={
                          favorites.some((item) => item.id === gif.id)
                            ? 'Remove from favorites'
                            : 'Add to favorites'
                        }
                        onClick={() => toggleFavorite(gif)}
                        className="absolute right-1.5 top-1.5 flex h-8 w-8 items-center justify-center rounded-full bg-black/70 opacity-0 hover:bg-black group-hover:opacity-100 focus:opacity-100"
                      >
                        <svg viewBox="0 0 24 24" className="h-4 w-4">
                          <path
                            d="M12 21s-8-4.8-8-11a4.5 4.5 0 0 1 8-2.8A4.5 4.5 0 0 1 20 10c0 6.2-8 11-8 11Z"
                            className={
                              favorites.some((item) => item.id === gif.id)
                                ? 'fill-[#e01e5a]'
                                : 'fill-transparent stroke-white stroke-2'
                            }
                          />
                        </svg>
                      </button>
                    </div>
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
