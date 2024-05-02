import type { Channel, Message } from '@boluo/api';
import clsx from 'clsx';
import { Hash, LockedHash, Plus, X } from '@boluo/icons';
import { atom, useAtomValue, useSetAtom } from 'jotai';
import { FC, useCallback, useMemo } from 'react';
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

interface Props {
  channel: Channel;
  active: boolean;
}

export const SidebarChannelItem: FC<Props> = ({ channel, active }) => {
  const replacePane = usePaneReplace();
  const intl = useIntl();
  const paneLimit = usePaneLimit();
  const setPane = useSetAtom(panesAtom);
  const addPane = usePaneAdd();
  const latestMessageAtom = useMemo(
    () =>
      selectAtom(chatAtom, (chat): Message | 'EMPTY' | 'UNLOAD' => {
        const channelState = chat.channels[channel.id];
        if (!channelState) return 'UNLOAD';
        const messages = channelState.messages ?? [];
        if (messages.length === 0) {
          if (channelState.fullLoaded) return 'EMPTY';
          return 'UNLOAD';
        }
        for (let i = messages.length - 1; i >= 0; i--) {
          const message = messages[i];
          if (!message) continue;
          if (!message.folded) {
            return messages[i]!;
          }
        }
        return messages[messages.length - 1]!;
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
  const titleClose = intl.formatMessage({ defaultMessage: 'Close' });
  const titleOpenNew = intl.formatMessage({ defaultMessage: 'Open in new pane' });
  const handleClick: React.MouseEventHandler<HTMLAnchorElement> = useCallback(
    (e) => {
      e.preventDefault();
      replacePane({ type: 'CHANNEL', channelId: channel.id });
    },
    [channel.id, replacePane],
  );
  const handleClickInnerButton = useCallback(
    (e: React.MouseEvent<HTMLButtonElement, MouseEvent>) => {
      if (paneLimit < 2) {
        return;
      }
      e.stopPropagation();
      e.preventDefault();
      if (active) {
        setPane((panes) => panes.filter((pane) => pane.type !== 'CHANNEL' || pane.channelId !== channel.id));
      } else {
        addPane({ type: 'CHANNEL', channelId: channel.id });
      }
    },
    [active, addPane, channel.id, paneLimit, setPane],
  );

  return (
    <div className="px-3 py-0.5">
      <a
        href="#" // TODO: link to channel
        className={clsx(
          'cursor-eointer group grid w-full grid-cols-[auto_1fr_auto] grid-rows-2 items-start gap-x-2 gap-y-1 rounded px-1 py-1 text-sm',
          active
            ? 'bg-sidebar-channels-active-bg hover:bg-sidebar-channels-active-hover'
            : 'hover:bg-sidebar-channels-hover',
        )}
        onClick={handleClick}
      >
        <button
          className={clsx(
            'group/icon relative row-span-2 h-full self-center text-base',
            active ? 'text-surface-900' : 'text-surface-400 group-hover:text-surface-700',
          )}
          onClick={handleClickInnerButton}
          title={active ? titleClose : titleOpenNew}
        >
          <Icon
            className={paneLimit < 2 ? '' : 'group-hover/icon:opacity-0'}
            icon={channel.isPublic ? Hash : LockedHash}
          />
          <Icon
            className={`absolute left-0 opacity-0 ${paneLimit < 2 ? '' : 'group-hover/icon:opacity-100'}`}
            icon={active ? X : Plus}
          />
        </button>
        <span className="text-left">{channel.name}</span>

        {typeof latestMessage !== 'string' && (
          <div
            data-unread={isUnread}
            data-is-action={latestMessage.isAction}
            className="col-start-2 truncate text-sm data-[unread=true]:font-bold data-[is-action=true]:italic"
          >
            <span className="text-text-light group-hover:text-text-base mr-1">
              {latestMessage.name}
              {latestMessage.isAction ? '' : ':'}
            </span>
            <span className="text-text-lighter group-hover:text-text-light">{latestMessageText || '…'}</span>
          </div>
        )}
        {latestMessage === 'UNLOAD' && <div className="bg-text-lighter/20 col-start-2 h-full w-full rounded-md"></div>}
        {latestMessage === 'EMPTY' && <div className="text-text-lighter col-start-2">-</div>}
      </a>
    </div>
  );
};
