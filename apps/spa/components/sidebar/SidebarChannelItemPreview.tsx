import { atom, useAtomValue, useStore } from 'jotai';
import { type FC, useCallback, useEffect, useMemo, useState } from 'react';
import { chatAtom } from '../../state/chat.atoms';
import { useIntl } from 'react-intl';
import { messageToParsed } from '../../interpreter/to-parsed';
import { toSimpleText } from '../../interpreter/entities';
import { type LatestMessageAtom } from './SidebarChannelItem';
import { type PreviewItem } from '../../state/channel.types';

interface Props {
  hasUnread: boolean;
  latestMessageAtom: LatestMessageAtom;
  channelId: string;
}

const TYPEING_TIMEOUT = 2000;

export const SidebarChannelItemPreview: FC<Props> = ({ hasUnread, channelId, latestMessageAtom }) => {
  const intl = useIntl();
  const store = useStore();
  const previewMapAtom = useMemo(() => atom((read) => read(chatAtom).channels[channelId]?.previewMap), [channelId]);

  // Sort by timestamp, descending.
  const [recentPreviews, setRecentPreviews] = useState<PreviewItem[]>([]);
  const updateRecentPreviews = useCallback(() => {
    const now = new Date().getTime();
    const previewMap = store.get(previewMapAtom) ?? {};
    const previews = Object.values(previewMap).filter(
      (preview) => now - preview.timestamp < TYPEING_TIMEOUT && (preview.text === null || preview.text.length > 0),
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
  }, [previewMapAtom, store]);
  useEffect(() => store.sub(previewMapAtom, updateRecentPreviews), [previewMapAtom, store, updateRecentPreviews]);
  const oldestRecentPreviewTimestamp = recentPreviews[0]?.timestamp;
  useEffect(() => {
    if (oldestRecentPreviewTimestamp == null) return;
    const now = new Date().getTime();
    const distance = now - oldestRecentPreviewTimestamp;
    if (distance < TYPEING_TIMEOUT) {
      const handle = window.setTimeout(updateRecentPreviews, TYPEING_TIMEOUT - distance);
      return () => window.clearTimeout(handle);
    } else {
      updateRecentPreviews();
    }
  }, [oldestRecentPreviewTimestamp, updateRecentPreviews]);
  const latestMessage = useAtomValue(latestMessageAtom);
  const latestMessageText: string = useMemo(() => {
    if (typeof latestMessage === 'string') {
      return '';
    }
    if (latestMessage.whisperToUsers !== null) {
      return `[${intl.formatMessage({ defaultMessage: 'Whisper' })}]`;
    }
    const parsed = messageToParsed(latestMessage.text, latestMessage.entities);
    return toSimpleText(parsed.text, parsed.entities);
  }, [intl, latestMessage]);
  return (
    <div className="col-start-2 h-5 w-full overflow-hidden">
      {typeof latestMessage !== 'string' && (
        <div
          data-unread={hasUnread}
          data-is-action={latestMessage.isAction}
          className="truncate text-sm data-[unread=true]:font-bold data-[is-action=true]:italic"
        >
          <span className="text-text-light group-hover:text-text-base mr-1">
            {latestMessage.name}
            {latestMessage.isAction ? '' : ':'}
          </span>
          <span className="text-text-lighter group-hover:text-text-light">{latestMessageText || '…'}</span>
        </div>
      )}
      {latestMessage === 'UNLOAD' && <div className="bg-text-lighter/20 h-4 w-full rounded-md"></div>}
      {latestMessage === 'EMPTY' && <div className="text-text-lighter">-</div>}
    </div>
  );
};
