import { useEffect, useState } from 'react';

import type { GifResult } from './GifPicker';

let favoriteIds = new Set<string>();
let favoritesRequest: Promise<void> | undefined;
const listeners = new Set<() => void>();

const notify = () => listeners.forEach((listener) => listener());

const loadFavorites = () => {
  if (!favoritesRequest) {
    favoritesRequest = fetch('/api/gifs/favorites')
      .then(async (response) => {
        if (!response.ok) return;
        const body = (await response.json()) as { gifs: GifResult[] };
        favoriteIds = new Set(body.gifs.map((gif) => gif.id));
        notify();
      })
      .catch(() => undefined);
  }
  return favoritesRequest;
};

const GifFavoriteButton = ({ gif }: { gif: GifResult }) => {
  const [, rerender] = useState(0);
  const [saving, setSaving] = useState(false);
  const favorite = favoriteIds.has(gif.id);

  useEffect(() => {
    const listener = () => rerender((value) => value + 1);
    listeners.add(listener);
    loadFavorites();
    return () => {
      listeners.delete(listener);
    };
  }, []);

  const toggle = async () => {
    if (saving) return;
    setSaving(true);
    if (favorite) {
      favoriteIds.delete(gif.id);
    } else {
      favoriteIds.add(gif.id);
    }
    notify();
    const response = await fetch(
      favorite
        ? `/api/gifs/favorites/${encodeURIComponent(gif.id)}`
        : '/api/gifs/favorites',
      {
        method: favorite ? 'DELETE' : 'POST',
        headers: favorite ? undefined : { 'Content-Type': 'application/json' },
        body: favorite ? undefined : JSON.stringify(gif),
      }
    ).catch(() => undefined);
    if (!response?.ok) {
      if (favorite) {
        favoriteIds.add(gif.id);
      } else {
        favoriteIds.delete(gif.id);
      }
      notify();
    }
    setSaving(false);
  };

  return (
    <button
      type="button"
      onClick={toggle}
      disabled={saving}
      title={favorite ? 'Remove from GIF favorites' : 'Add to GIF favorites'}
      aria-label={
        favorite ? 'Remove from GIF favorites' : 'Add to GIF favorites'
      }
      className="flex h-8 w-8 items-center justify-center rounded bg-[#111214cc] opacity-0 shadow group-hover/attachment:opacity-100 focus:opacity-100 disabled:opacity-60"
    >
      <svg viewBox="0 0 24 24" className="h-[18px] w-[18px]">
        <path
          d="M12 21s-8-4.8-8-11a4.5 4.5 0 0 1 8-2.8A4.5 4.5 0 0 1 20 10c0 6.2-8 11-8 11Z"
          className={
            favorite
              ? 'fill-[#f23f42]'
              : 'fill-transparent stroke-white stroke-2'
          }
        />
      </svg>
    </button>
  );
};

export default GifFavoriteButton;
