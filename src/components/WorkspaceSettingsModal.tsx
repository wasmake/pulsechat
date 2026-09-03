import { FormEvent, useEffect, useState } from 'react';

import { Workspace } from '@/app/client/layout';
import Button from './Button';
import Modal from './Modal';
import TextField from './TextField';

const accentOptions = [
  '#4a154b',
  '#1264a3',
  '#007a5a',
  '#9b4d00',
  '#8c1d40',
  '#3f46ad',
];

type WorkspaceSettingsModalProps = {
  open: boolean;
  workspace: Workspace;
  onClose: () => void;
  onSave: (workspace: Workspace) => void;
};

export default function WorkspaceSettingsModal({
  open,
  workspace,
  onClose,
  onSave,
}: WorkspaceSettingsModalProps) {
  const [name, setName] = useState(workspace.name);
  const [image, setImage] = useState(workspace.image || '');
  const [accentColor, setAccentColor] = useState(workspace.accentColor);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!open) return;
    setName(workspace.name);
    setImage(workspace.image || '');
    setAccentColor(workspace.accentColor);
    setError('');
  }, [open, workspace]);

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setLoading(true);
    setError('');

    try {
      const response = await fetch(`/api/workspaces/${workspace.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, image, accentColor }),
      });
      const result = await response.json();
      if (!response.ok)
        throw new Error(result.error || 'Unable to save changes');

      onSave({ ...workspace, ...result.workspace });
      onClose();
    } catch (saveError) {
      setError(
        saveError instanceof Error
          ? saveError.message
          : 'Unable to save changes'
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Workspace settings"
      loading={loading}
    >
      <form className="flex flex-col gap-5" onSubmit={submit}>
        <TextField
          label="Workspace name"
          name="workspaceName"
          placeholder="Your team name"
          value={name}
          maxLength={80}
          onChange={(event) => setName(event.target.value)}
          required
        />
        <TextField
          label="Workspace image"
          name="workspaceImage"
          type="url"
          placeholder="https://example.com/team.png"
          value={image}
          onChange={(event) => setImage(event.target.value)}
        />
        <fieldset>
          <legend className="mb-2.5 text-base font-medium">Accent color</legend>
          <div className="flex flex-wrap gap-3">
            {accentOptions.map((color) => (
              <button
                key={color}
                type="button"
                aria-label={`Use ${color} as accent color`}
                aria-pressed={accentColor === color}
                className="h-9 w-9 rounded-full border-2 border-white/20 transition-transform hover:scale-110 aria-pressed:ring-2 aria-pressed:ring-white aria-pressed:ring-offset-2 aria-pressed:ring-offset-[#1a1d21]"
                style={{ backgroundColor: color }}
                onClick={() => setAccentColor(color)}
              />
            ))}
            <label className="relative h-9 w-9 cursor-pointer overflow-hidden rounded-full border-2 border-white/20">
              <span className="sr-only">Custom accent color</span>
              <input
                type="color"
                className="absolute -inset-2 h-14 w-14 cursor-pointer"
                value={accentColor}
                onChange={(event) => setAccentColor(event.target.value)}
              />
            </label>
          </div>
        </fieldset>
        {error && (
          <p role="alert" className="text-sm text-[#e89192]">
            {error}
          </p>
        )}
        <div className="flex justify-end gap-3">
          <Button type="button" variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" loading={loading} disabled={!name.trim()}>
            Save changes
          </Button>
        </div>
      </form>
    </Modal>
  );
}
