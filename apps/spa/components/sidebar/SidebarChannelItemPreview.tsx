import { atom, useAtomValue, useStore } from 'jotai';
import { type FC, useCallback, useEffect, useMemo, useState } from 'react';
import { chatAtom } from '../../state/chat.atoms';
import { FormattedMessage, useIntl } from 'react-intl';
import { messageToParsed, toSimpleText } from '@boluo/interpreter';
import { type LatestMessageAtom } from './SidebarChannelItem';
import { type PreviewItem } from '../../state/channel.types';
import clsx from 'clsx';
import * as L from 'list';

interface Props {
  hasUnread: boolean;
  latestMessageAtom: LatestMessageAtom;
  channelId: string;
  myId: string | null | undefined;
}

const TYPEING_TIMEOUT = 2000;

export const SidebarChannelItemPreview: FC<Props> = ({
  hasUnread,
  channelId,
  latestMessageAtom,
  myId,
}) => {
  const intl = useIntl();
  const store = useStore();
  const previewMapAtom = useMemo(
    () => atom((read) => read(chatAtom).channels[channelId]?.previewMap),
    [channelId],
  );
  const messagesAtom = useMemo(
    () => atom((read) => read(chatAtom).channels[channelId]?.messages),
    [channelId],
  );

  // Sort by timestamp, ascending (oldest first), so we can schedule a single timeout
  // to re-check when the oldest preview expires.
  const [recentPreviews, setRecentPreviews] = useState<PreviewItem[]>([]);
  const updateRecentPreviews = useCallback(() => {
    const now = Date.now();
    const previewMap = store.get(previewMapAtom) ?? {};
    const messages = store.get(messagesAtom);
    const latestMessagePosSet = new Set<number>();
    if (messages) {
      const start = Math.max(0, messages.length - 30);
      for (let i = start; i < messages.length; i++) {
        const message = L.nth(i, messages);
        if (message) {
          latestMessagePosSet.add(message.pos);
        }
      }
    }
    const previews = Object.values(previewMap).filter(
      (preview) =>
        preview.senderId !== myId &&
        preview.edit == null &&
        !latestMessagePosSet.has(preview.pos) &&
        now - preview.timestamp < TYPEING_TIMEOUT &&
        (preview.text == null || preview.text.length > 0),
    );
    previews.sort((a, b) => a.timestamp - b.timestamp);
    setRecentPreviews((oldPreviews): PreviewItem[] => {
      if (previews.length !== oldPreviews.length) {
        return previews;
      }
      for (let i = 0; i < previews.length; i++) {
        const newPreview = previews[i]!;
        const oldPreview = oldPreviews[i]!;
        if (newPreview.timestamp !== oldPreview.timestamp || newPreview.id !== oldPreview.id) {
          return previews;
        }
      }
      return oldPreviews;
    });
  }, [messagesAtom, myId, previewMapAtom, store]);

  // Update recent previews when previewMap/messages changes
  useEffect(() => {
    const handle = window.setTimeout(updateRecentPreviews, 0);
    const unsubscribe = store.sub(previewMapAtom, updateRecentPreviews);
    const unsubscribeMessages = store.sub(messagesAtom, updateRecentPreviews);
    return () => {
      window.clearTimeout(handle);
      unsubscribe();
      unsubscribeMessages();
    };
  }, [messagesAtom, previewMapAtom, store, updateRecentPreviews]);

  // Schedule re-check when the oldest preview expires
  const oldestRecentPreviewTimestamp = recentPreviews[0]?.timestamp;
  useEffect(() => {
    if (oldestRecentPreviewTimestamp == null) return;
    const now = Date.now();
    const distance = now - oldestRecentPreviewTimestamp;
    const delay = distance < TYPEING_TIMEOUT ? TYPEING_TIMEOUT - distance : 0;
    const handle = window.setTimeout(updateRecentPreviews, delay);
    return () => window.clearTimeout(handle);
  }, [oldestRecentPreviewTimestamp, updateRecentPreviews]);

  const typingNames: string[] = useMemo(() => {
    const previews: PreviewItem[] = [];
    const masterPreview = recentPreviews.find((preview) => preview.isMaster);
    if (masterPreview) {
      previews.push(masterPreview);
    }
    for (const preview of recentPreviews) {
      if (preview.isMaster) continue;
      if (previews.find((x) => x.senderId === preview.senderId)) continue;
      previews.push(preview);
    }
    return previews.map((preview) => preview.name);
  }, [recentPreviews]);
  const latestMessage = useAtomValue(latestMessageAtom);
  const latestMessageText: string = useMemo(() => {
    if (typeof latestMessage === 'string') {
      return '';
    }
    if (latestMessage.whisperToUsers != null) {
      return `[${intl.formatMessage({ defaultMessage: 'Whisper' })}]`;
    }
    const parsed = messageToParsed(latestMessage.text, latestMessage.entities);
    return toSimpleText(parsed.text, parsed.entities);
  }, [intl, latestMessage]);
  const someoneIsTyping = typingNames.length > 0;
  const containerClass: string = clsx(
    'col-start-2 h-5 w-full overflow-hidden',
    someoneIsTyping ? 'animate-pulse text-text-secondary' : '',
  );
  if (typingNames.length === 1) {
    const [name] = typingNames;
    return (
      <div className={containerClass}>
        <FormattedMessage defaultMessage="{name} is composing…" values={{ name }} />
      </div>
    );
  } else if (typingNames.length === 2) {
    const [a, b] = typingNames;
    return (
      <div className={containerClass}>
        <FormattedMessage defaultMessage="{a} and {b} are composing…" values={{ a, b }} />
      </div>
    );
  } else if (typingNames.length > 2) {
    const [name, ...rest] = typingNames;
    return (
      <div className={containerClass}>
        <FormattedMessage
          defaultMessage="{name} and {count} others are composing…"
          values={{ name, count: rest.length }}
        />
      </div>
    );
  }
  return (
    <div className={containerClass}>
      {typeof latestMessage !== 'string' && (
        <div data-is-action={latestMessage.isAction} className="truncate text-sm italic">
          {hasUnread && (
            <span className="bg-action-toggle-indicator-on my-px mr-1 inline-block h-2 w-2 rounded-full">
              <span className="sr-only">
                <FormattedMessage defaultMessage="[Unread]" />
              </span>
            </span>
          )}
          <span className="text-text-secondary group-hover:text-text-primary mr-1">
            {latestMessage.name}
            {latestMessage.isAction ? '' : ':'}
          </span>
          <span className="text-text-muted group-hover:text-text-secondary">
            {latestMessageText || '…'}
          </span>
        </div>
      )}
      {latestMessage === 'UNLOAD' && (
        <div className="bg-text-subtle/20 h-4 w-full rounded-md"></div>
      )}
      {latestMessage === 'EMPTY' && <div className="text-text-muted">-</div>}
    </div>
  );
};
