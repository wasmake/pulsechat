import { useChannelStateContext, useTypingContext } from 'stream-chat-react';

const TypingStatus = () => {
  const { channel } = useChannelStateContext('TypingStatus');
  const { typing = {} } = useTypingContext('TypingStatus');
  const currentUserId = channel.getClient().userID;
  const names = Object.values(typing)
    .filter(
      (event) =>
        event.user?.id !== currentUserId && !event.parent_id && event.user?.name
    )
    .map((event) => event.user!.name!);

  if (!names.length) return <div className="h-5" />;

  const label =
    names.length === 1
      ? `${names[0]} is typing`
      : names.length === 2
        ? `${names[0]} and ${names[1]} are typing`
        : `${names[0]} and ${names.length - 1} others are typing`;

  return (
    <div className="flex h-5 items-center gap-2 px-1 text-xs text-[#b5bac1]">
      <span className="flex items-end gap-0.5" aria-hidden="true">
        <i className="typing-dot" />
        <i className="typing-dot" />
        <i className="typing-dot" />
      </span>
      <span>
        <strong className="text-[#dbdee1]">{label}</strong>
        {'...'}
      </span>
    </div>
  );
};

export default TypingStatus;
