import { createPortal } from 'react-dom';
import { Channel as ChannelType } from 'stream-chat';
import {
  Channel,
  DefaultStreamChatGenerics,
  MessageInput,
  MessageList,
  Window,
} from 'stream-chat-react';

import ChannelLoading from './ChannelLoading';
import ChannelMessage from './ChannelMessage';
import DateSeperator from './DateSeparator';
import InputContainer from './InputContainer';
import PinnedMessages from './PinnedMessages';

interface ChannelChatProps {
  channel: ChannelType<DefaultStreamChatGenerics>;
  activeTab?: 'messages' | 'pins';
}

const ChannelChat = ({ channel, activeTab = 'messages' }: ChannelChatProps) => {
  const inputContainer = document.getElementById('message-input');

  return (
    <div className="w-full h-full">
      <Channel
        LoadingIndicator={ChannelLoading}
        channel={channel}
        DateSeparator={DateSeperator}
      >
        {activeTab === 'messages' ? (
          <Window>
            <MessageList Message={ChannelMessage} />
            {inputContainer &&
              createPortal(
                <MessageInput Input={InputContainer} />,
                inputContainer
              )}
          </Window>
        ) : (
          <PinnedMessages channel={channel} />
        )}
      </Channel>
    </div>
  );
};

export default ChannelChat;
