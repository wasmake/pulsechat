'use client';

import { ChangeEvent, FormEvent, useEffect, useState } from 'react';

import Avatar from './Avatar';
import Modal from './Modal';

type User = {
  id: string;
  name: string;
  email: string;
  image?: string | null;
};

const UserSettingsModal = ({
  open,
  user,
  onClose,
  onSignOut,
}: {
  open: boolean;
  user: User;
  onClose: () => void;
  onSignOut: () => void;
}) => {
  const [name, setName] = useState(user.name);
  const [avatar, setAvatar] = useState<File>();
  const [preview, setPreview] = useState<string>();
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    setName(user.name);
    setAvatar(undefined);
    setPreview(undefined);
    setError('');
  }, [user.name, open]);

  useEffect(
    () => () => {
      if (preview) URL.revokeObjectURL(preview);
    },
    [preview]
  );

  const selectAvatar = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    if (preview) URL.revokeObjectURL(preview);
    setAvatar(file);
    setPreview(URL.createObjectURL(file));
    setError('');
  };

  const save = async (event: FormEvent) => {
    event.preventDefault();
    setSaving(true);
    setError('');
    const form = new FormData();
    form.set('name', name);
    if (avatar) form.set('avatar', avatar);
    try {
      const response = await fetch('/api/users/me', {
        method: 'PATCH',
        body: form,
      });
      const body = await response.json();
      if (!response.ok) {
        throw new Error(body.error || 'Unable to update your profile');
      }
      location.reload();
    } catch (saveError) {
      setError(
        saveError instanceof Error
          ? saveError.message
          : 'Unable to update your profile'
      );
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Profile & settings"
      loading={saving}
    >
      <form onSubmit={save} className="flex flex-col gap-5 text-[#fafafa]">
        <div className="flex items-center gap-4 rounded-lg border border-[#27272a] bg-[#09090b] p-4">
          <Avatar
            width={64}
            borderRadius={12}
            fontSize={24}
            fontWeight={700}
            data={{ name, image: preview || user.image || undefined }}
          />
          <div>
            <label className="inline-flex cursor-pointer rounded-md border border-[#3f3f46] bg-[#18181b] px-3 py-2 text-sm font-medium hover:bg-[#27272a]">
              Upload a photo
              <input
                type="file"
                accept="image/jpeg,image/png,image/webp,image/gif"
                className="sr-only"
                onChange={selectAvatar}
              />
            </label>
            <p className="mt-2 text-xs text-[#71717a]">
              JPG, PNG, WebP or GIF. Max 5 MB.
            </p>
          </div>
        </div>
        <label className="flex flex-col gap-2 text-sm font-medium text-[#e4e4e7]">
          Display name
          <input
            value={name}
            onChange={(event) => setName(event.target.value)}
            maxLength={80}
            required
            className="h-10 rounded-md border border-[#3f3f46] bg-[#09090b] px-3 font-normal outline-none focus:border-[#71717a]"
          />
        </label>
        <div>
          <p className="text-sm font-medium text-[#e4e4e7]">Email address</p>
          <p className="mt-2 rounded-md border border-[#27272a] bg-[#09090b] px-3 py-2 text-sm text-[#a1a1aa]">
            {user.email}
          </p>
          <p className="mt-1.5 text-xs text-[#71717a]">
            Managed by your Authy account.
          </p>
        </div>
        {error && (
          <p
            role="alert"
            className="rounded-md bg-red-950/40 px-3 py-2 text-sm text-[#fca5a5]"
          >
            {error}
          </p>
        )}
        <div className="flex items-center justify-between border-t border-[#27272a] pt-5">
          <button
            type="button"
            onClick={onSignOut}
            className="rounded-md px-3 py-2 text-sm font-medium text-[#f87171] hover:bg-red-950/40"
          >
            Sign out
          </button>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={onClose}
              className="rounded-md border border-[#3f3f46] bg-[#18181b] px-4 py-2 text-sm font-medium hover:bg-[#27272a]"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving}
              className="rounded-md bg-[#fafafa] px-4 py-2 text-sm font-medium text-[#18181b] hover:bg-[#e4e4e7] disabled:opacity-60"
            >
              {saving ? 'Saving...' : 'Save changes'}
            </button>
          </div>
        </div>
      </form>
    </Modal>
  );
};

export default UserSettingsModal;
