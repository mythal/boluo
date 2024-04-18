import type { Channel } from '@boluo/api';
import clsx from 'clsx';
import { Hash, LockedHash, X } from '@boluo/icons';
import { useAtomValue, useSetAtom } from 'jotai';
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

interface Props {
  channel: Channel;
  active: boolean;
}

export const SidebarChannelItem: FC<Props> = ({ channel, active }) => {
  const replacePane = usePaneReplace();
  const setPane = useSetAtom(panesAtom);
  const addPane = usePaneAdd();
  const latestMessageAtom = useMemo(
    () =>
      selectAtom(chatAtom, (chat) => {
        const channelState = chat.channels[channel.id];
        const messages = channelState?.messages ?? [];
        if (messages.length === 0) {
          return null;
        }
        return messages[messages.length - 1];
      }),
    [channel.id],
  );
  const latestMessage = useAtomValue(latestMessageAtom);
  const latestMessageText: string = useMemo(() => {
    if (latestMessage == null) {
      return '';
    }
    const parsed = messageToParsed(latestMessage.text, latestMessage.entities);
    return toSimpleText(parsed.text, parsed.entities);
  }, [latestMessage]);
  const intl = useIntl();
  const titleClose = intl.formatMessage({ defaultMessage: 'Close' });
  const titleOpenNew = intl.formatMessage({ defaultMessage: 'Open in new pane' });
  const handleClick: React.MouseEventHandler<HTMLAnchorElement> = useCallback(
    (e) => {
      e.preventDefault();
      replacePane({ type: 'CHANNEL', channelId: channel.id }, (pane) => pane.type === 'CHANNEL');
    },
    [channel.id, replacePane],
  );
  const handleClickInnerButton = useCallback(
    (e: React.MouseEvent<HTMLButtonElement, MouseEvent>) => {
      e.stopPropagation();
      e.preventDefault();
      if (active) {
        setPane((panes) => panes.filter((pane) => pane.type !== 'CHANNEL' || pane.channelId !== channel.id));
      } else {
        addPane({ type: 'CHANNEL', channelId: channel.id });
      }
    },
    [active, addPane, channel.id, setPane],
  );

  return (
    <div className="px-2 py-0.5">
      <a
        href="#" // TODO: link to channel
        className={clsx(
          'cursor-eointer group grid w-full grid-cols-[auto_1fr_auto] grid-rows-2 items-start gap-x-2 gap-y-1 rounded-sm px-1 py-1 text-sm',
          active ? 'bg-surface-100 hover:bg-surface-50' : 'hover:bg-surface-50',
        )}
        onClick={handleClick}
      >
        <div
          className={clsx(
            'row-span-2 self-center',
            active ? 'text-surface-900' : 'text-surface-400 group-hover:text-surface-700',
          )}
        >
          <Icon icon={channel.isPublic ? Hash : LockedHash} />
        </div>
        <span className="text-left">{channel.name}</span>
        <div className="row-span-2">
          <button
            onClick={handleClickInnerButton}
            title={active ? titleClose : titleOpenNew}
            className={clsx(
              ' inline-flex items-center justify-center',
              active ? 'text-surface-400' : 'text-surface-300',
              'group-hover:text-brand-600 group-hover:bg-surface-200/50 h-5 w-5 rounded-sm',
            )}
          >
            <span className={clsx('transform transition-transform duration-100 ', active ? 'rotate-0' : 'rotate-45')}>
              <Icon icon={X} />
            </span>
          </button>
        </div>

        {latestMessage && latestMessageText ? (
          <div className="col-start-2 truncate text-sm">
            <span className="text-text-light group-hover:text-text-base mr-1">
              {latestMessage.name}
              {latestMessage.isAction ? '' : ':'}
            </span>
            <span className="text-text-lighter group-hover:text-text-light">{latestMessageText}</span>
          </div>
        ) : (
          <div className="bg-text-lighter/20 col-start-2 h-full w-full rounded-md"></div>
        )}
      </a>
    </div>
  );
};
