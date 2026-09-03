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
    const response = await fetch('/api/users/me', {
      method: 'PATCH',
      body: form,
    });
    const body = await response.json();
    if (!response.ok) {
      setError(body.error || 'Unable to update your profile');
      setSaving(false);
      return;
    }
    location.reload();
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Profile & settings"
      loading={saving}
    >
      <form onSubmit={save} className="flex flex-col gap-6 text-white">
        <div className="flex items-center gap-5 rounded-xl bg-[#22252a] p-4">
          <Avatar
            width={72}
            borderRadius={14}
            fontSize={28}
            fontWeight={700}
            data={{ name, image: preview || user.image || undefined }}
          />
          <div>
            <label className="inline-flex cursor-pointer rounded-md border border-[#797c814d] px-3 py-2 text-sm font-bold hover:bg-hover-gray">
              Upload a photo
              <input
                type="file"
                accept="image/jpeg,image/png,image/webp,image/gif"
                className="sr-only"
                onChange={selectAvatar}
              />
            </label>
            <p className="mt-2 text-xs text-[#ababad]">
              JPG, PNG, WebP or GIF. Max 5 MB.
            </p>
          </div>
        </div>
        <label className="flex flex-col gap-2 text-sm font-bold">
          Display name
          <input
            value={name}
            onChange={(event) => setName(event.target.value)}
            maxLength={80}
            required
            className="h-10 rounded-md border border-[#797c814d] bg-[#1a1d21] px-3 font-normal outline-none focus:border-[#1d9bd1]"
          />
        </label>
        <div>
          <p className="text-sm font-bold">Email address</p>
          <p className="mt-2 text-sm text-[#b9babd]">{user.email}</p>
          <p className="mt-1 text-xs text-[#777a80]">
            Managed by your Authy account.
          </p>
        </div>
        {error && (
          <p role="alert" className="text-sm text-[#ff9b9b]">
            {error}
          </p>
        )}
        <div className="flex items-center justify-between border-t border-[#797c814d] pt-5">
          <button
            type="button"
            onClick={onSignOut}
            className="rounded-md px-3 py-2 text-sm font-bold text-[#ff9b9b] hover:bg-hover-gray"
          >
            Sign out
          </button>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={onClose}
              className="rounded-md px-4 py-2 text-sm font-bold hover:bg-hover-gray"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving}
              className="rounded-md bg-[#007a5a] px-4 py-2 text-sm font-bold hover:bg-[#148567] disabled:opacity-60"
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
