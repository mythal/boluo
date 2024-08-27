import type { Channel, Message } from '@boluo/api';
import clsx from 'clsx';
import { Drama, Hash, Lock, MoveVertical, Plus, X } from '@boluo/icons';
import { atom, useAtomValue, useSetAtom } from 'jotai';
import { type FC, useCallback, useMemo } from 'react';
import { useIntl } from 'react-intl';
import Icon from '@boluo/ui/Icon';
import { usePaneAdd } from '../../hooks/usePaneAdd';
import { usePaneReplace } from '../../hooks/usePaneReplace';
import { panesAtom } from '../../state/view.atoms';
import { chatAtom } from '../../state/chat.atoms';
import { selectAtom } from 'jotai/utils';
import { messageToParsed } from '../../interpreter/to-parsed';
import { toSimpleText } from '../../interpreter/entities';
import { channelReadFamily } from '../../state/unread.atoms';
import { usePaneLimit } from '../../hooks/useMaxPane';
import { useIsReordering } from '../../hooks/useIsReordering';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { findLast, last } from 'list';

interface Props {
  channel: Channel;
  active: boolean;
  overlay?: boolean;
}

export const SidebarChannelItem: FC<Props> = ({ channel, active, overlay = false }) => {
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
  const latestMessageAtom = useMemo(
    () =>
      selectAtom(chatAtom, (chat): Message | 'EMPTY' | 'UNLOAD' => {
        const channelState = chat.channels[channel.id];
        if (!channelState) return 'UNLOAD';
        const messages = channelState.messages;
        const bottom = last(messages);
        if (!bottom) {
          return channelState.fullLoaded ? 'EMPTY' : 'UNLOAD';
        }
        return findLast((message) => !message.folded, messages) ?? bottom;
      }),
    [channel.id],
  );
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
  const isUnread = useAtomValue(
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
        setPane((panes) => panes.filter((pane) => pane.type !== 'CHANNEL' || pane.channelId !== channel.id));
      } else {
        addPane({ type: 'CHANNEL', channelId: channel.id });
      }
    },
    [active, addPane, channel.id, isReordering, paneLimit, setPane],
  );
  const paneUrlPart = encodeURIComponent(JSON.stringify([{ type: 'CHANNEL', channelId: channel.id, key: 0 }]));
  const iconButton = (
    <button
      className={clsx(
        'group/icon relative row-span-2 h-full self-center',
        active ? 'text-surface-900' : 'text-surface-400 group-hover:text-surface-700',
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
      {channel.isPublic ? '' : <Icon className="text-text-light mr-1" icon={Lock} />}
      {channel.name}
    </span>
  );
  const messagePreview = (
    <div className="col-start-2 h-5 w-full overflow-hidden">
      {typeof latestMessage !== 'string' && (
        <div
          data-unread={isUnread}
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
            active
              ? 'bg-sidebar-channels-active-bg hover:bg-sidebar-channels-active-hover'
              : 'hover:bg-sidebar-channels-hover',
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
          active
            ? 'bg-sidebar-channels-active-bg hover:bg-sidebar-channels-active-hover'
            : 'hover:bg-sidebar-channels-hover',
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
  return <Icon className={!interactive || isReordering ? '' : 'group-hover/icon:opacity-0'} icon={icon} />;
};
