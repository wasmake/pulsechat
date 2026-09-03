import { Channel as ChannelType, UserResponse } from 'stream-chat';
import { useState } from 'react';
import {
  Channel,
  DefaultStreamChatGenerics,
  MessageInput,
  MessageList,
  Thread,
  Window,
} from 'stream-chat-react';

import ChannelLoading from './ChannelLoading';
import ChannelMessage from './ChannelMessage';
import DateSeperator from './DateSeparator';
import InputContainer from './InputContainer';
import PinnedMessages from './PinnedMessages';
import MentionProfileCard from './MentionProfileCard';

interface ChannelChatProps {
  channel: ChannelType<DefaultStreamChatGenerics>;
  activeTab?: 'messages' | 'pins';
}

const ChannelChat = ({ channel, activeTab = 'messages' }: ChannelChatProps) => {
  const [mentionProfile, setMentionProfile] = useState<{
    user: UserResponse;
    position: { x: number; y: number };
  }>();

  return (
    <div className="w-full h-full">
      <Channel
        LoadingIndicator={ChannelLoading}
        channel={channel}
        DateSeparator={DateSeperator}
        giphyVersion="fixed_height"
        onMentionsClick={(event, user) => {
          if (!user) return;
          const pointer = event.nativeEvent as MouseEvent;
          setMentionProfile({
            user,
            position: { x: pointer.clientX, y: pointer.clientY },
          });
        }}
      >
        {activeTab === 'messages' ? (
          <>
            <Window>
              <MessageList Message={ChannelMessage} />
              <div className="px-5 pb-2">
                <MessageInput Input={InputContainer} />
              </div>
            </Window>
            <Thread Message={ChannelMessage} Input={InputContainer} />
          </>
        ) : (
          <PinnedMessages channel={channel} />
        )}
      </Channel>
      {mentionProfile && (
        <MentionProfileCard
          user={mentionProfile.user}
          position={mentionProfile.position}
          onClose={() => setMentionProfile(undefined)}
        />
      )}
    </div>
  );
};

export default ChannelChat;
