import type { ThreadHeaderProps } from 'stream-chat-react';

import Close from './icons/Close';

const DiscordThreadHeader = ({ closeThread }: ThreadHeaderProps) => (
  <div className="flex h-12 shrink-0 items-center justify-between border-b border-[#3f4147] px-4 text-[#f2f3f5] shadow-sm">
    <div className="min-w-0">
      <h2 className="text-base font-bold">Thread</h2>
      <p className="text-[11px] text-[#949ba4]">Continue the conversation</p>
    </div>
    <button
      type="button"
      onClick={closeThread}
      aria-label="Close thread"
      className="rounded p-1.5 hover:bg-[#3f4147]"
    >
      <Close size={18} color="#b5bac1" />
    </button>
  </div>
);

export default DiscordThreadHeader;
