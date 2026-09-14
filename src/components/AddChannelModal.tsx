import { FormEvent, useContext, useEffect, useMemo, useState } from 'react';
import type { Channel } from '@prisma/client';
import { useRouter } from 'next/navigation';

import { AppContext } from '../app/client/layout';
import Modal from './Modal';
import Spinner from './Spinner';
import TextField from './TextField';

interface AddChannelModalProps {
  open: boolean;
  onClose: () => void;
  channel?: Channel;
}

const AddChannelModal = ({ open, onClose, channel }: AddChannelModalProps) => {
  const router = useRouter();
  const { setChannel, workspace, setWorkspace } = useContext(AppContext);
  const [channelName, setChannelName] = useState('');
  const [channelDescription, setChannelDescription] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!open) return;
    setChannelName(channel?.name || '');
    setChannelDescription(channel?.description || '');
    setError('');
  }, [channel, open]);

  const channelNameRegex = useMemo(() => {
    const channelNames = workspace.channels
      .filter((item) => item.id !== channel?.id)
      .map((item) => item.name);
    return `^(?!${channelNames.join('|')}).+$`;
  }, [channel?.id, workspace.channels]);

  const createChannel = async (e: FormEvent) => {
    const regex = new RegExp(channelNameRegex);
    if (channelName && regex.test(channelName)) {
      e.stopPropagation();
      try {
        setLoading(true);
        setError('');
        const response = await fetch(
          channel
            ? `/api/workspaces/${workspace.id}/channels/${channel.id}`
            : `/api/workspaces/${workspace.id}/channels/create`,
          {
            method: channel ? 'PATCH' : 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              name: channelName.trim(),
              description: channelDescription.trim(),
            }),
          }
        );

        const result = await response.json();

        if (response.ok) {
          const savedChannel = result.channel;
          setWorkspace({
            ...workspace,
            channels: channel
              ? workspace.channels.map((item) =>
                  item.id === channel.id ? savedChannel : item
                )
              : [...workspace.channels, savedChannel],
          });
          setChannel(savedChannel);
          setLoading(false);
          closeModal();
          if (!channel)
            router.push(`/client/${workspace.id}/${savedChannel.id}`);
        } else {
          setError(result.error || 'Unable to save channel');
        }
      } catch (error) {
        console.error('Error creating workspace:', error);
        setError('An unexpected error occurred.');
      } finally {
        setLoading(false);
      }
    }
  };

  const closeModal = () => {
    setChannelName('');
    setChannelDescription('');
    onClose();
  };

  if (!open) return null;

  return (
    <Modal
      open={open}
      onClose={closeModal}
      loading={loading}
      title={channel ? 'Edit channel' : 'Create a channel'}
    >
      <form
        onSubmit={createChannel}
        action={() => {}}
        className="flex flex-col gap-6"
      >
        <TextField
          name="channelName"
          label="Channel name"
          placeholder="e.g. plan-budget"
          value={channelName}
          onChange={(e) => setChannelName(e.target.value.toLowerCase())}
          pattern={channelNameRegex}
          title="That name is already taken by another channel in this workspace"
          maxLength={80}
          required
        />
        <TextField
          name="channelDescription"
          label={
            <span>
              Channel description{' '}
              <span className="text-[#9a9b9e] ml-0.5">(optional)</span>
            </span>
          }
          placeholder="Add a description"
          value={channelDescription}
          onChange={(e) => setChannelDescription(e.target.value)}
          multiline={5}
          maxLength={250}
        />
        {error && (
          <p
            role="alert"
            className="rounded-md bg-red-950/40 px-3 py-2 text-sm text-[#fca5a5]"
          >
            {error}
          </p>
        )}
        <div className="w-full flex items-center justify-end gap-3">
          <button
            type="submit"
            className="order-2 flex h-9 min-w-[80px] items-center justify-center rounded-md bg-[#fafafa] px-3 text-sm font-medium text-[#18181b] hover:bg-[#e4e4e7]"
            disabled={loading}
          >
            {loading ? <Spinner /> : 'Save'}
          </button>
          <button
            onClick={closeModal}
            type="button"
            className="h-9 min-w-[80px] rounded-md border border-[#3f3f46] bg-[#18181b] px-3 text-sm font-medium text-[#e4e4e7] hover:bg-[#27272a]"
            disabled={loading}
          >
            Cancel
          </button>
        </div>
      </form>
    </Modal>
  );
};

export default AddChannelModal;
