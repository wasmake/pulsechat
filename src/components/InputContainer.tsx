import {
  ReactNode,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import clsx from 'clsx';
import {
  Editable,
  withReact,
  useSlate,
  Slate,
  RenderLeafProps,
  RenderElementProps,
  ReactEditor,
} from 'slate-react';
import {
  Editor,
  Transforms,
  createEditor,
  Descendant as SlateDescendant,
  Element as SlateElement,
  Text,
  Range,
} from 'slate';
import isHotkey from 'is-hotkey';
import { withHistory } from 'slate-history';
import {
  useChannelActionContext,
  useChannelStateContext,
  useMessageInputContext,
} from 'stream-chat-react';
import type { UserResponse } from 'stream-chat';

import { AppContext } from '../app/client/layout';
import Avatar from './Avatar';
import Bold from './icons/Bold';
import BulletedList from './icons/BulletedList';
import Close from './icons/Close';
import Code from './icons/Code';
import CodeBlock from './icons/CodeBlock';
import Emoji from './icons/Emoji';
import EmojiPicker from './EmojiPicker';
import Formatting from './icons/Formatting';
import Italic from './icons/Italic';
import Link from './icons/Link';
import Mentions from './icons/Mentions';
import Microphone from './icons/Microphone';
import NumberedList from './icons/NumberedList';
import Plus from './icons/Plus';
import Quote from './icons/Quote';
import Strikethrough from './icons/Strikethrough';
import Video from './icons/Video';
import Send from './icons/Send';
import CaretDown from './icons/CaretDown';
import GifPicker, { GifResult } from './GifPicker';

type Descendant = Omit<SlateDescendant, 'children'> & {
  children: (
    | {
        text: string;
      }
    | {
        text: string;
        bold: boolean;
      }
    | {
        text: string;
        italic: boolean;
      }
    | {
        text: string;
        code: boolean;
      }
    | {
        text: string;
        underline: boolean;
      }
    | {
        text: string;
        strikethrough: boolean;
      }
  )[];
  url?: string;
  type: string;
};

type FileInfo = {
  name: string;
  size: number;
  type: string;
  previewUrl?: string;
};

type MentionSuggestion =
  | {
      type: 'user';
      id: string;
      name: string;
      email: string;
      image: string | null;
    }
  | {
      type: 'role';
      id: string;
      name: string;
      color: string;
      memberCount: number;
    }
  | {
      type: 'special';
      id: 'here' | 'everyone' | 'active';
      name: string;
      description: string;
    };

const specialMentions: MentionSuggestion[] = [
  {
    type: 'special',
    id: 'here',
    name: 'here',
    description: 'Members in this channel',
  },
  {
    type: 'special',
    id: 'everyone',
    name: 'everyone',
    description: 'Everyone in the workspace',
  },
  {
    type: 'special',
    id: 'active',
    name: 'active',
    description: 'Currently active members',
  },
];

const escapeRegExp = (value: string) =>
  value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

const containsMention = (text: string, prefix: '@' | '#', name: string) =>
  new RegExp(
    `(^|\\s)${prefix}${escapeRegExp(name)}(?=\\s|$|[.,!?;:])`,
    'i'
  ).test(text);

const HOTKEYS: {
  [key: string]: string;
} = {
  'mod+b': 'bold',
  'mod+i': 'italic',
  'mod+u': 'underline',
  'mod+`': 'code',
};

const LIST_TYPES = ['numbered-list', 'bulleted-list'];

const initialValue: Descendant[] = [
  {
    type: 'paragraph',
    children: [{ text: '' }],
  },
];

const InputContainer = () => {
  const { workspace, presenceById } = useContext(AppContext);
  const { channel } = useChannelStateContext();
  const { sendMessage, addNotification, setQuotedMessage } =
    useChannelActionContext();
  const { quotedMessage } = useChannelStateContext();
  const {
    uploadNewFiles,
    attachments,
    removeAttachments,
    cooldownRemaining,
    parent,
  } = useMessageInputContext();

  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const emojiSelection = useRef<Range | null>(null);
  const [filesInfo, setFilesInfo] = useState<FileInfo[]>([]);
  const [mentionQuery, setMentionQuery] = useState<string | null>(null);
  const [channelQuery, setChannelQuery] = useState<string | null>(null);
  const [mentionedUsers, setMentionedUsers] = useState<UserResponse[]>([]);
  const lastComposerText = useRef('');

  const renderElement = useCallback(
    (props: ElementProps) => <Element {...props} />,
    []
  );
  const renderLeaf = useCallback(
    (props: RenderLeafProps) => <Leaf {...props} />,
    []
  );
  const editor = useMemo(() => withHistory(withReact(createEditor())), []);
  const channelName = useMemo(() => {
    const currentChannel = workspace.channels.find((c) => c.id === channel.id);
    return currentChannel?.name || String(channel.data?.name || 'message');
  }, [workspace.channels, channel.id, channel.data?.name]);

  const mentionSuggestions = useMemo(() => {
    if (mentionQuery === null) return [];
    const query = mentionQuery.toLowerCase();
    const specials = specialMentions.filter((mention) =>
      mention.name.includes(query)
    );
    const roles: MentionSuggestion[] = workspace.roles
      .filter((role) => role.name.toLowerCase().includes(query))
      .map((role) => ({
        type: 'role',
        id: role.id,
        name: role.name,
        color: role.color,
        memberCount: workspace.memberships.filter(
          (membership) => membership.roleId === role.id
        ).length,
      }));
    const users: MentionSuggestion[] = workspace.memberships
      .map(({ user }) => ({ type: 'user' as const, ...user }))
      .filter(
        (member) =>
          member.name.toLowerCase().includes(query) ||
          member.email.toLowerCase().includes(query)
      );
    return [...specials, ...roles, ...users].slice(0, 8);
  }, [mentionQuery, workspace.memberships, workspace.roles]);

  const channelSuggestions = useMemo(() => {
    if (channelQuery === null) return [];
    const query = channelQuery.toLowerCase();
    return workspace.channels
      .filter((item) => item.name.toLowerCase().includes(query))
      .slice(0, 8);
  }, [channelQuery, workspace.channels]);

  const serializeToMarkdown = (nodes: Descendant[]) => {
    return nodes.map((n) => serializeNode(n)).join('\n');
  };

  const serializeNode = (
    node: Descendant | Descendant['children'],
    parentType: string | null = null,
    indentation: string = ''
  ) => {
    if (Text.isText(node)) {
      let text = node.text;
      const formattedNode = node as Text & {
        bold?: boolean;
        italic?: boolean;
        code?: boolean;
        strikethrough?: boolean;
      };
      if (formattedNode.bold) text = `**${text}**`;
      if (formattedNode.italic) text = `*${text}*`;
      if (formattedNode.strikethrough) text = `~~${text}~~`;
      if (formattedNode.code) text = `\`${text}\``;

      return text;
    }

    const formattedNode = node as Descendant;
    const children: string = formattedNode.children
      .map((n) => serializeNode(n as never, formattedNode.type, indentation))
      .join('');

    switch (formattedNode.type) {
      case 'paragraph':
        return `${children}`;
      case 'block-quote':
        return `> ${children}`;
      case 'bulleted-list':
      case 'numbered-list':
        return `${children}`;
      case 'list-item': {
        const prefix = parentType === 'numbered-list' ? '1. ' : '- ';
        const indentedPrefix = `${indentation}${prefix}`;
        return `${indentedPrefix}${children}\n`;
      }
      case 'code-block':
        return `\`\`\`\n${children}\n\`\`\``;
      default:
        return `${children}`;
    }
  };

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.currentTarget.files;
    if (files && files.length > 0) {
      const filesArray = Array.from(files);
      uploadNewFiles(files);
      const newFilesInfo: FileInfo[] = [];
      filesArray.forEach((file) => {
        const fileData: FileInfo = {
          name: file.name,
          size: file.size,
          type: file.type,
        };

        if (file.type.startsWith('image/')) {
          const reader = new FileReader();
          reader.onloadend = () => {
            setFilesInfo((prevFiles) => [
              ...prevFiles,
              { ...fileData, previewUrl: reader.result as string },
            ]);
          };
          reader.readAsDataURL(file);
        } else {
          newFilesInfo.push(fileData);
        }
      });
      setFilesInfo((prevFiles) => [...prevFiles, ...newFilesInfo]);
      e.currentTarget.value = '';
    }
  };

  const handleUploadButtonClick = () => {
    if (fileInputRef.current) {
      fileInputRef.current?.click();
    }
  };

  const handleRemoveFile = (index: number) => {
    setFilesInfo((prevFiles) => {
      const newFiles = prevFiles.filter((_, i) => i !== index);
      return newFiles;
    });

    removeAttachments([attachments[index].localMetadata.id]);

    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handlePaste = (event: React.ClipboardEvent<HTMLDivElement>) => {
    const clipboardItems = event.clipboardData.items;
    for (let i = 0; i < clipboardItems.length; i++) {
      const item = clipboardItems[i];
      if (item.type.indexOf('image') !== -1) {
        const imageFile = item.getAsFile();
        if (imageFile) {
          const fileData: FileInfo = {
            name: imageFile.name,
            size: imageFile.size,
            type: imageFile.type,
          };
          const reader = new FileReader();
          reader.onloadend = () => {
            uploadNewFiles([imageFile]);
            setFilesInfo((prevFiles) => [
              ...prevFiles,
              { ...fileData, previewUrl: reader.result as string },
            ]);
          };
          reader.readAsDataURL(imageFile);
        }
        event.preventDefault();
      }
    }
  };

  const handleSubmit = async () => {
    const rawText = serializeToMarkdown(editor.children as Descendant[]);
    if (rawText || attachments.length > 0) {
      try {
        const activeRoles = workspace.roles.filter((role) =>
          containsMention(rawText, '@', role.name)
        );
        const activeSpecials = specialMentions.filter((mention) =>
          containsMention(rawText, '@', mention.name)
        );
        const activeChannels = workspace.channels.filter((item) =>
          containsMention(rawText, '#', item.name)
        );
        let text = rawText;
        for (const mentionedChannel of activeChannels) {
          const expression = new RegExp(
            `(^|\\s)#${escapeRegExp(mentionedChannel.name)}(?=\\s|$|[.,!?;:])`,
            'gi'
          );
          text = text.replace(
            expression,
            `$1[#${mentionedChannel.name}](${location.origin}/client/${workspace.id}/${mentionedChannel.id})`
          );
        }
        const roleMemberIds = new Set(
          workspace.memberships
            .filter((membership) =>
              activeRoles.some((role) => role.id === membership.roleId)
            )
            .map((membership) => membership.userId)
        );
        const channelMemberIds = new Set(
          Object.keys(channel.state.members || {})
        );
        const specialMemberIds = new Set(
          workspace.memberships
            .filter((membership) =>
              activeSpecials.some((mention) => {
                if (mention.id === 'everyone') return true;
                if (mention.id === 'here')
                  return channelMemberIds.has(membership.userId);
                return presenceById[membership.userId]?.online === true;
              })
            )
            .map((membership) => membership.userId)
        );
        const activeMentions = mentionedUsers.filter(
          (member) => member.name && containsMention(rawText, '@', member.name)
        );
        const expandedMembers = workspace.memberships
          .filter(
            (membership) =>
              roleMemberIds.has(membership.userId) ||
              specialMemberIds.has(membership.userId)
          )
          .map((membership) => membership.user);
        const allMentionedUsers = [
          ...activeMentions,
          ...expandedMembers,
        ].filter(
          (member, index, items) =>
            member.id !== channel.getClient().userID &&
            items.findIndex((item) => item.id === member.id) === index
        );
        await sendMessage(
          {
            text,
            attachments,
            mentioned_users: allMentionedUsers,
            role_mentions: activeRoles,
            special_mentions: activeSpecials.map(({ id, name }) => ({
              id,
              name,
            })),
            channel_mentions: activeChannels.map(({ id, name }) => ({
              id,
              name,
            })),
            parent,
          } as never,
          quotedMessage ? { quoted_message_id: quotedMessage.id } : undefined
        );
        await channel.stopTyping(parent?.id);
        setFilesInfo([]);
        setMentionedUsers([]);
        setMentionQuery(null);
        setChannelQuery(null);
        setQuotedMessage(undefined);
        lastComposerText.current = '';
        removeAttachments(attachments.map((a) => a.localMetadata.id));

        const point = { path: [0, 0], offset: 0 };
        editor.selection = { anchor: point, focus: point };
        editor.history = { redos: [], undos: [] };
        editor.children = initialValue;
      } catch (error) {
        addNotification(
          error instanceof Error ? error.message : 'Unable to send message',
          'error'
        );
      }
    }
  };

  const updateComposerState = () => {
    const text = Editor.string(editor, []);
    if (text !== lastComposerText.current) {
      lastComposerText.current = text;
      if (text) {
        channel.keystroke(parent?.id).catch(() => undefined);
      } else {
        channel.stopTyping(parent?.id).catch(() => undefined);
      }
    }
    if (!editor.selection || !Range.isCollapsed(editor.selection)) {
      setMentionQuery(null);
      setChannelQuery(null);
      return;
    }
    const beforeCursor = Editor.string(editor, {
      anchor: Editor.start(editor, []),
      focus: editor.selection.anchor,
    });
    const match = beforeCursor.match(/(?:^|\s)@([^\s@]{0,40})$/);
    setMentionQuery(match ? match[1] : null);
    const channelMatch = beforeCursor.match(/(?:^|\s)#([^\s#]{0,80})$/);
    setChannelQuery(channelMatch ? channelMatch[1] : null);
  };

  useEffect(
    () => () => {
      channel.stopTyping(parent?.id).catch(() => undefined);
    },
    [channel, parent?.id]
  );

  const insertMention = (suggestion: MentionSuggestion) => {
    if (!editor.selection || mentionQuery === null) return;
    const start = Editor.before(editor, editor.selection.anchor, {
      distance: mentionQuery.length + 1,
      unit: 'character',
    });
    if (start) {
      Transforms.delete(editor, {
        at: { anchor: start, focus: editor.selection.anchor },
      });
    }
    Transforms.insertText(editor, `@${suggestion.name} `);
    if (suggestion.type === 'user') {
      setMentionedUsers((current) => [
        ...current.filter((item) => item.id !== suggestion.id),
        suggestion,
      ]);
    } else if (suggestion.type === 'role') {
      const roleMembers = workspace.memberships
        .filter((membership) => membership.roleId === suggestion.id)
        .map((membership) => membership.user);
      setMentionedUsers((current) =>
        [...current, ...roleMembers].filter(
          (member, index, items) =>
            items.findIndex((item) => item.id === member.id) === index
        )
      );
    }
    setMentionQuery(null);
    ReactEditor.focus(editor);
  };

  const insertChannelMention = (mentionedChannel: {
    id: string;
    name: string;
  }) => {
    if (!editor.selection || channelQuery === null) return;
    const start = Editor.before(editor, editor.selection.anchor, {
      distance: channelQuery.length + 1,
      unit: 'character',
    });
    if (start) {
      Transforms.delete(editor, {
        at: { anchor: start, focus: editor.selection.anchor },
      });
    }
    Transforms.insertText(editor, `#${mentionedChannel.name} `);
    setChannelQuery(null);
    ReactEditor.focus(editor);
  };

  const sendGif = async (gif: GifResult) => {
    try {
      await sendMessage(
        {
          text: '',
          parent,
          attachments: [
            {
              type: 'image',
              image_url: gif.url,
              thumb_url: gif.previewUrl,
              title: gif.title,
              klipy_id: gif.id,
              klipy_slug: gif.slug,
              klipy_preview_url: gif.previewUrl,
              klipy_width: gif.width,
              klipy_height: gif.height,
            },
          ],
        },
        quotedMessage ? { quoted_message_id: quotedMessage.id } : undefined
      );
      setQuotedMessage(undefined);
      fetch('/api/gifs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ slug: gif.slug, query: gif.query }),
      }).catch(() => undefined);
    } catch (error) {
      addNotification(
        error instanceof Error ? error.message : 'Unable to send GIF',
        'error'
      );
      throw error;
    }
  };

  return (
    <Slate
      editor={editor}
      initialValue={initialValue}
      onChange={updateComposerState}
    >
      <div className="input-container relative overflow-visible rounded-xl border border-[#3f3f46] bg-[#09090b] shadow-sm transition-colors focus-within:border-[#71717a]">
        {quotedMessage && !parent && (
          <div className="flex items-center justify-between gap-3 border-b border-[#565856] px-3 py-2 text-xs text-[#b9babd]">
            <div className="min-w-0 border-l-2 border-[#5865f2] pl-2">
              <span className="font-bold text-[#f2f3f5]">
                Replying to {quotedMessage.user?.name || 'member'}
              </span>
              <p className="truncate">
                {quotedMessage.text ||
                  (quotedMessage.attachments?.length
                    ? 'Attachment'
                    : 'Message')}
              </p>
            </div>
            <button
              type="button"
              aria-label="Cancel reply"
              onClick={() => setQuotedMessage(undefined)}
              className="rounded p-1 hover:bg-[#3f4147]"
            >
              <Close size={16} color="var(--icon-gray)" />
            </button>
          </div>
        )}
        <div className="[&>.formatting]:has-[:focus]:opacity-100 [&>.formatting]:has-[:focus]:select-text flex flex-col">
          {/* Formatting */}
          <div className="formatting flex w-full cursor-text border-b border-[#27272a] p-1 opacity-60">
            <div className="flex grow h-[30px]">
              <Button
                type="mark"
                format="bold"
                icon={<Bold color="var(--icon-gray)" />}
              />
              <Button
                type="mark"
                format="italic"
                icon={<Italic color="var(--icon-gray)" />}
              />
              <Button
                type="mark"
                format="strikethrough"
                icon={<Strikethrough color="var(--icon-gray)" />}
              />
              <div className="separator h-5 w-[1px] mx-1 my-0.5 self-center flex-shrink-0 bg-[#e8e8e821]" />
              <Button format="none" icon={<Link color="var(--icon-gray)" />} />
              <div className="separator h-5 w-[1px] mx-1 my-0.5 self-center flex-shrink-0 bg-[#e8e8e821]" />
              <Button
                type="block"
                format="numbered-list"
                icon={<NumberedList color="var(--icon-gray)" />}
              />
              <Button
                type="block"
                format="bulleted-list"
                icon={<BulletedList color="var(--icon-gray)" />}
              />
              <div className="separator h-5 w-[1px] mx-1 my-0.5 self-center flex-shrink-0 bg-[#e8e8e821]" />
              <Button
                type="block"
                format="block-quote"
                icon={<Quote color="var(--icon-gray)" />}
              />
              <div className="hidden sm:block separator h-5 w-[1px] mx-1 my-0.5 self-center flex-shrink-0 bg-[#e8e8e821]" />
              <Button
                type="mark"
                format="code"
                icon={<Code color="var(--icon-gray)" />}
                className="hidden sm:inline-flex"
              />
              <Button
                type="block"
                format="code-block"
                icon={<CodeBlock color="var(--icon-gray)" />}
                className="hidden sm:inline-flex"
              />
            </div>
          </div>
          {/* Input */}
          <div className="flex self-stretch cursor-text">
            <div className="flex grow px-3 py-3 text-[14.8px] leading-[1.46668]">
              <div
                style={{
                  scrollbarWidth: 'none',
                }}
                className="flex-1 min-h-[22px] scroll- overflow-y-scroll max-h-[calc(60svh-80px)]"
              >
                <Editable
                  renderElement={renderElement as never}
                  renderLeaf={renderLeaf}
                  placeholder={`Message #${channelName}`}
                  className="editable min-h-[24px] text-[#e4e4e7] outline-none"
                  onPaste={handlePaste}
                  spellCheck
                  autoFocus
                  onKeyDown={(event) => {
                    if (mentionQuery !== null && mentionSuggestions.length) {
                      if (event.key === 'Escape') {
                        event.preventDefault();
                        setMentionQuery(null);
                        return;
                      }
                      if (event.key === 'Enter' || event.key === 'Tab') {
                        event.preventDefault();
                        insertMention(mentionSuggestions[0]);
                        return;
                      }
                    }
                    if (channelQuery !== null && channelSuggestions.length) {
                      if (event.key === 'Escape') {
                        event.preventDefault();
                        setChannelQuery(null);
                        return;
                      }
                      if (event.key === 'Enter' || event.key === 'Tab') {
                        event.preventDefault();
                        insertChannelMention(channelSuggestions[0]);
                        return;
                      }
                    }
                    if (event.key === 'Enter') {
                      if (event.shiftKey) {
                        return;
                      } else {
                        event.preventDefault();
                        handleSubmit();
                      }
                    }
                    if (isHotkey('mod+a', event)) {
                      event.preventDefault();
                      Transforms.select(editor, []);
                      return;
                    }
                    for (const hotkey in HOTKEYS) {
                      if (isHotkey(hotkey, event as never)) {
                        event.preventDefault();
                        const mark = HOTKEYS[hotkey];
                        toggleMark(editor, mark);
                      }
                    }
                  }}
                />
                {mentionQuery !== null && mentionSuggestions.length > 0 && (
                  <div className="absolute bottom-[92px] left-3 z-50 w-[min(380px,calc(100%-24px))] rounded-lg border border-[#27272a] bg-[#0f0f12] p-1.5 shadow-2xl">
                    <p className="px-2 py-1.5 text-xs font-medium text-[#71717a]">
                      Mention a person or role
                    </p>
                    {mentionSuggestions.map((suggestion) => (
                      <button
                        key={`${suggestion.type}-${suggestion.id}`}
                        type="button"
                        onMouseDown={(event) => event.preventDefault()}
                        onClick={() => insertMention(suggestion)}
                        className="flex w-full items-center gap-2 rounded-md px-2 py-2 text-left hover:bg-[#27272a]"
                      >
                        {suggestion.type === 'user' ? (
                          <Avatar
                            width={28}
                            borderRadius={7}
                            fontSize={12}
                            data={suggestion}
                          />
                        ) : suggestion.type === 'role' ? (
                          <span
                            className="flex h-7 w-7 items-center justify-center rounded-md bg-[#27272a] text-sm font-semibold"
                            style={{ color: suggestion.color }}
                          >
                            @
                          </span>
                        ) : (
                          <span className="flex h-7 w-7 items-center justify-center rounded-md bg-[#27272a] text-sm font-semibold text-[#e4e4e7]">
                            @
                          </span>
                        )}
                        <span className="truncate text-sm font-medium text-[#e4e4e7]">
                          {suggestion.name}
                        </span>
                        <span className="ml-auto truncate text-xs text-[#71717a]">
                          {suggestion.type === 'user'
                            ? suggestion.email
                            : suggestion.type === 'role'
                              ? `${suggestion.memberCount} members`
                              : suggestion.description}
                        </span>
                      </button>
                    ))}
                  </div>
                )}
                {channelQuery !== null && channelSuggestions.length > 0 && (
                  <div className="absolute bottom-[92px] left-3 z-50 w-[min(380px,calc(100%-24px))] rounded-lg border border-[#27272a] bg-[#0f0f12] p-1.5 shadow-2xl">
                    <p className="px-2 py-1.5 text-xs font-medium text-[#71717a]">
                      Link to a channel
                    </p>
                    {channelSuggestions.map((mentionedChannel) => (
                      <button
                        key={mentionedChannel.id}
                        type="button"
                        onMouseDown={(event) => event.preventDefault()}
                        onClick={() => insertChannelMention(mentionedChannel)}
                        className="flex w-full items-center gap-2 rounded-md px-2 py-2 text-left hover:bg-[#27272a]"
                      >
                        <span className="flex h-7 w-7 items-center justify-center rounded-md bg-[#27272a] text-sm text-[#a1a1aa]">
                          #
                        </span>
                        <span className="truncate text-sm font-medium text-[#e4e4e7]">
                          {mentionedChannel.name}
                        </span>
                        <span className="ml-auto truncate text-xs text-[#71717a]">
                          {mentionedChannel.description || 'Chat channel'}
                        </span>
                      </button>
                    ))}
                  </div>
                )}
                {/* File preview section */}
                {filesInfo.length > 0 && (
                  <div className="relative mt-4 flex items-center gap-3 flex-wrap">
                    {filesInfo.map((file, index) => (
                      <div key={index} className="group relative max-w-[234px]">
                        {file.previewUrl ? (
                          <div className="relative w-[62px] h-[62px] grow shrink-0 cursor-pointer">
                            {/* eslint-disable-next-line @next/next/no-img-element */}
                            <img
                              src={file.previewUrl}
                              alt={`File Preview ${index}`}
                              className="w-full h-full object-cover rounded-xl border-[#d6d6d621] border"
                            />
                          </div>
                        ) : (
                          <div className="flex items-center rounded-xl gap-3 p-3 border border-[#d6d6d621] bg-[#1a1d21]">
                            <Avatar
                              width={32}
                              borderRadius={8}
                              data={{ name: file.type }}
                            />
                            <div className="flex flex-col gap-0.5">
                              <p className="text-sm text-[#d1d2d3] break-all whitespace-break-spaces line-clamp-1 mr-2">
                                {file.name}
                              </p>
                              <p className="text-[13px] text-[#ababad] break-all whitespace-break-spaces line-clamp-1">
                                {file.type}
                              </p>
                            </div>
                          </div>
                        )}
                        <div className="group-hover:opacity-100 opacity-0 absolute -top-2.5 -right-2.5 flex items-center justify-center w-[22px] h-[22px] rounded-full bg-black">
                          <button
                            onClick={() => handleRemoveFile(index)}
                            className="w-[18px] h-[18px] flex items-center justify-center rounded-full bg-gray-300"
                          >
                            <Close size={14} color="black" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
          {/* Composer actions */}
          <div className="flex h-11 cursor-text items-center justify-between border-t border-[#18181b] pl-2 pr-2">
            <div className="flex item-center">
              <button
                onClick={handleUploadButtonClick}
                className="m-0.5 flex h-7 w-7 items-center justify-center rounded-md p-0.5 hover:bg-[#27272a]"
              >
                <Plus size={18} color="var(--icon-gray)" />
                <input
                  type="file"
                  ref={fileInputRef}
                  className="hidden"
                  onChange={handleFileInputChange}
                />
              </button>
              <Button
                format="none"
                className="rounded hover:bg-[#d1d2d30b] [&_path]:hover:fill-channel-gray"
                icon={<Formatting color="var(--icon-gray)" />}
              />
              <EmojiPicker
                buttonClassName="w-7 h-7 p-0.5 m-0.5 inline-flex items-center justify-center rounded [&_path]:fill-icon-gray hover:bg-[#d1d2d30b] [&_path]:hover:fill-channel-gray"
                ButtonIconComponent={Emoji}
                wrapperClassName="relative"
                onOpen={() => {
                  emojiSelection.current = editor.selection;
                }}
                onEmojiSelect={(e) => {
                  if (emojiSelection.current) {
                    Transforms.select(editor, emojiSelection.current);
                  }
                  Transforms.insertText(editor, e.native);
                  ReactEditor.focus(editor);
                }}
              />
              <GifPicker onSelect={sendGif} />
              <button
                type="button"
                aria-label="Mention someone"
                onMouseDown={(event) => event.preventDefault()}
                onClick={() => {
                  Transforms.insertText(editor, '@');
                  ReactEditor.focus(editor);
                }}
                className="rounded hover:bg-[#d1d2d30b] [&_path]:hover:fill-channel-gray"
              >
                <Mentions color="var(--icon-gray)" />
              </button>
              <div className="hidden sm:block separator h-5 w-[1px] mx-1.5 my-0.5 self-center flex-shrink-0 bg-[#e8e8e821]" />
              <Button
                format="none"
                className="hidden sm:inline-flex rounded hover:bg-[#d1d2d30b] [&_path]:hover:fill-channel-gray"
                icon={<Video color="var(--icon-gray)" />}
              />
              <Button
                format="none"
                className="hidden sm:inline-flex rounded hover:bg-[#d1d2d30b] [&_path]:hover:fill-channel-gray"
                icon={<Microphone color="var(--icon-gray)" />}
              />
            </div>
            <div className="ml-2 mr-0.5 flex h-8 items-center rounded-md bg-[#fafafa] text-[#18181b]">
              <button
                onClick={handleSubmit}
                disabled={!!cooldownRemaining}
                className="h-8 rounded-l-md px-2 hover:bg-[#e4e4e7]"
              >
                <Send
                  color={
                    !Boolean(cooldownRemaining) ? '#18181b' : 'var(--icon-gray)'
                  }
                  size={16}
                  filled
                />
              </button>
              <div className="h-5 w-px cursor-pointer bg-[#a1a1aa]" />
              <button className="flex h-8 w-[22px] items-center justify-center rounded-r-md hover:bg-[#e4e4e7]">
                <CaretDown
                  size={16}
                  color={
                    !Boolean(cooldownRemaining) ? '#18181b' : 'var(--icon-gray)'
                  }
                />
              </button>
            </div>
          </div>
        </div>
      </div>
    </Slate>
  );
};

const toggleBlock = (editor: Editor, format: string) => {
  const isActive = isBlockActive(editor, format);
  const isList = LIST_TYPES.includes(format);

  Transforms.unwrapNodes(editor, {
    match: (n) =>
      !Editor.isEditor(n) &&
      SlateElement.isElement(n) &&
      LIST_TYPES.includes((n as Descendant).type),
    split: true,
  });
  const newProperties: Partial<Descendant> = {
    type: isActive ? 'paragraph' : isList ? 'list-item' : format,
  };
  Transforms.setNodes<SlateElement>(editor, newProperties);

  if (!isActive && isList) {
    const block = { type: format, children: [] };
    Transforms.wrapNodes(editor, block);
  }
};

const toggleMark = (editor: Editor, format: string) => {
  const isActive = isMarkActive(editor, format);

  if (isActive) {
    Editor.removeMark(editor, format);
  } else {
    Editor.addMark(editor, format, true);
  }
};

const isBlockActive = (editor: Editor, format: string, blockType = 'type') => {
  const { selection } = editor;
  if (!selection) return false;

  const [match] = Array.from(
    Editor.nodes(editor, {
      at: Editor.unhangRange(editor, selection),
      match: (n) =>
        !Editor.isEditor(n) &&
        SlateElement.isElement(n) &&
        (n as never)[blockType] === format,
    })
  );

  return !!match;
};

const isMarkActive = (editor: Editor, format: string) => {
  const marks = Editor.marks(editor) as null;
  return marks ? marks[format] : false;
};

type ElementProps = RenderElementProps & {
  element: {
    type: string;
    align?: CanvasTextAlign;
  };
};

const Element = (props: ElementProps) => {
  const { attributes, children, element } = props;
  switch (element.type) {
    case 'block-quote':
      return <blockquote {...attributes}>{children}</blockquote>;
    case 'bulleted-list':
      return <ul {...attributes}>{children}</ul>;
    case 'list-item':
      return <li {...attributes}>{children}</li>;
    case 'numbered-list':
      return <ol {...attributes}>{children}</ol>;
    case 'code-block':
      return (
        <div {...attributes} className="code-block">
          {children}
        </div>
      );
    default:
      return <p {...attributes}>{children}</p>;
  }
};

interface LeafProps extends RenderLeafProps {
  leaf: {
    bold?: boolean;
    code?: boolean;
    italic?: boolean;
    underline?: boolean;
    strikethrough?: boolean;
    text: string;
  };
}

const Leaf = ({ attributes, children, leaf }: LeafProps) => {
  if (leaf.bold) {
    children = <strong>{children}</strong>;
  }

  if (leaf.code) {
    children = <code>{children}</code>;
  }

  if (leaf.italic) {
    children = <em>{children}</em>;
  }

  if (leaf.underline) {
    children = <u>{children}</u>;
  }

  if (leaf.strikethrough) {
    children = <s>{children}</s>;
  }

  return <span {...attributes}>{children}</span>;
};

interface ButtonProps {
  active?: boolean;
  className?: string;
  icon: ReactNode;
  format: string;
  type?: 'mark' | 'block';
}

const Button = ({ className, format, icon, type }: ButtonProps) => {
  const editor = useSlate();
  const isActive =
    type === 'block'
      ? isBlockActive(editor, format)
      : isMarkActive(editor, format);

  return (
    <button
      className={clsx(
        'w-7 h-7 p-0.5 m-0.5 inline-flex items-center justify-center rounded',
        isActive ? 'bg-[#414347] hover:bg-[#4b4c51]' : 'bg-transparent',
        className
      )}
      onClick={(e) => {
        e.preventDefault();
        if (type === 'block') {
          toggleBlock(editor, format);
        } else if (type === 'mark') {
          toggleMark(editor, format);
        }
      }}
    >
      {icon}
    </button>
  );
};

export default InputContainer;
