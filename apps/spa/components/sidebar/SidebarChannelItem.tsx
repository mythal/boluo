import type { Channel } from '@boluo/api';
import clsx from 'clsx';
import { Drama, Hash, Lock, MoveVertical, Plus, X } from '@boluo/icons';
import { type Atom, atom, useAtomValue, useSetAtom } from 'jotai';
import { type FC, useCallback, useMemo } from 'react';
import { useIntl } from 'react-intl';
import Icon from '@boluo/ui/Icon';
import { usePaneAdd } from '../../hooks/usePaneAdd';
import { usePaneReplace } from '../../hooks/usePaneReplace';
import { panesAtom } from '../../state/view.atoms';
import { chatAtom } from '../../state/chat.atoms';
import { channelReadFamily } from '../../state/unread.atoms';
import { usePaneLimit } from '../../hooks/useMaxPane';
import { useIsReordering } from '../../hooks/useIsReordering';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { findLast, last } from 'list';
import { type MessageItem } from '../../state/channel.types';
import { SidebarChannelItemPreview } from './SidebarChannelItemPreview';

interface Props {
  channel: Channel;
  active: boolean;
  overlay?: boolean;
  myId: string | null | undefined;
}
export type LatestMessageAtom = Atom<'UNLOAD' | 'EMPTY' | MessageItem>;

export const SidebarChannelItem: FC<Props> = ({ channel, active, overlay = false, myId }) => {
  const replacePane = usePaneReplace();
  const intl = useIntl();
  const paneLimit = usePaneLimit();
  const setPane = useSetAtom(panesAtom);
  const addPane = usePaneAdd();
  const isReordering = useIsReordering();
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: channel.id,
    disabled: !isReordering,
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };
  const messagesAtom = useMemo(
    () => atom((read) => read(chatAtom).channels[channel.id]?.messages),
    [channel.id],
  );
  const fullLoadedAtom = useMemo(
    () => atom((read) => read(chatAtom).channels[channel.id]?.fullLoaded ?? false),
    [channel.id],
  );
  const latestMessageAtom: LatestMessageAtom = useMemo(
    () =>
      atom((read) => {
        const messages = read(messagesAtom);
        if (!messages) return 'UNLOAD';
        const bottom = last(messages);
        if (!bottom) {
          return read(fullLoadedAtom) ? 'EMPTY' : 'UNLOAD';
        }
        return findLast((message) => !message.folded, messages) ?? 'EMPTY';
      }),
    [fullLoadedAtom, messagesAtom],
  );
  const hasUnread = useAtomValue(
    useMemo(() => {
      const ReadPositionAtom = channelReadFamily(channel.id);
      return atom((get) => {
        const latestMessage = get(latestMessageAtom);
        const readPosition = get(ReadPositionAtom);
        if (latestMessage === 'EMPTY' || latestMessage === 'UNLOAD') return false;
        return readPosition < latestMessage.pos;
      });
    }, [channel.id, latestMessageAtom]),
  );
  const labelReorder = intl.formatMessage({ defaultMessage: 'Reorder channel' });
  const labelClose = intl.formatMessage({ defaultMessage: 'Close' });
  const labelOpenNew = intl.formatMessage({ defaultMessage: 'Open in new pane' });
  const handleClick: React.MouseEventHandler<HTMLAnchorElement> = useCallback(
    (e) => {
      e.preventDefault();
      if (isReordering) {
        return;
      }
      replacePane({ type: 'CHANNEL', channelId: channel.id });
    },
    [channel.id, isReordering, replacePane],
  );
  const handleClickButton = useCallback(
    (e: React.MouseEvent<HTMLButtonElement, MouseEvent>) => {
      e.stopPropagation();
      e.preventDefault();
      if (paneLimit < 2 || isReordering) {
        return;
      }
      if (active) {
        setPane((panes) =>
          panes.filter((pane) => pane.type !== 'CHANNEL' || pane.channelId !== channel.id),
        );
      } else {
        addPane({ type: 'CHANNEL', channelId: channel.id });
      }
    },
    [active, addPane, channel.id, isReordering, paneLimit, setPane],
  );
  const paneUrlPart = encodeURIComponent(
    JSON.stringify([{ type: 'CHANNEL', channelId: channel.id, key: 0 }]),
  );
  const iconButton = (
    <button
      className={clsx(
        'group/icon relative row-span-2 h-full self-center',
        active ? 'text-text-primary' : 'text-text-subtle group-hover:text-text-secondary',
        isReordering ? 'cursor-grab' : 'cursor-pointer',
      )}
      onClick={handleClickButton}
      aria-label={isReordering ? labelReorder : active ? labelClose : labelOpenNew}
    >
      <ChannelItemIcon channel={channel} interactive={paneLimit >= 2} isReordering={isReordering} />
      {!isReordering && (
        <Icon
          className={`absolute left-0 opacity-0 ${paneLimit < 2 ? '' : 'group-hover/icon:opacity-100'}`}
          icon={active ? X : Plus}
        />
      )}
    </button>
  );
  const channelName = (
    <span className="text-left">
      {channel.isPublic ? '' : <Icon className="text-text-secondary mr-1" icon={Lock} />}
      {channel.name}
    </span>
  );
  const messagePreview = useMemo(
    () => (
      <SidebarChannelItemPreview
        myId={myId}
        latestMessageAtom={latestMessageAtom}
        channelId={channel.id}
        hasUnread={hasUnread}
      />
    ),
    [hasUnread, myId, latestMessageAtom, channel.id],
  );
  if (isReordering) {
    return (
      <div
        ref={setNodeRef}
        style={style}
        {...attributes}
        {...listeners}
        className={`px-3 py-0.5 ${isDragging ? 'opacity-0' : ''} ${overlay ? 'cursor-grabbing opacity-75' : 'cursor-grab'}`}
      >
        <span
          className={clsx(
            'group grid w-full grid-cols-[1rem_1fr_auto] grid-rows-[auto_auto] items-start gap-x-1 gap-y-1 rounded px-1 py-1 text-sm',
            active ? 'bg-surface-selectable-selected' : 'hover:bg-surface-selectable-hover',
          )}
          onClick={handleClick}
        >
          {iconButton}
          {channelName}
          {messagePreview}
        </span>
      </div>
    );
  }

  return (
    <div className="px-3 py-0.5">
      <a
        href={`#route=${channel.spaceId}&panes=${paneUrlPart}`}
        className={clsx(
          'group grid w-full cursor-pointer grid-cols-[1rem_1fr_auto] grid-rows-[auto_auto] items-start gap-x-1 gap-y-1 rounded px-1 py-1 text-sm',
          active ? 'bg-surface-selectable-selected' : 'hover:bg-surface-selectable-hover',
        )}
        onClick={handleClick}
      >
        {iconButton}
        {channelName}
        {messagePreview}
      </a>
    </div>
  );
};

const ChannelItemIcon: FC<{ channel: Channel; interactive: boolean; isReordering: boolean }> = ({
  channel,
  interactive,
  isReordering,
}) => {
  let icon = Hash;
  if (isReordering) {
    icon = MoveVertical;
  } else if (channel.type === 'IN_GAME') {
    icon = Drama;
  }
  return (
    <Icon
      className={!interactive || isReordering ? '' : 'group-hover/icon:opacity-0'}
      icon={icon}
    />
  );
};
