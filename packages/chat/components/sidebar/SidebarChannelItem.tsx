import type { Channel } from 'api';
import clsx from 'clsx';
import { Hash, LockedHash, X } from 'icons';
import { useSetAtom } from 'jotai';
import { FC, useCallback } from 'react';
import { useIntl } from 'react-intl';
import Icon from 'ui/Icon';
import { usePaneAdd } from '../../hooks/usePaneAdd';
import { usePaneReplace } from '../../hooks/usePaneReplace';
import { panesAtom } from '../../state/view.atoms';

interface Props {
  channel: Channel;
  active: boolean;
}

export const SidebarChannelItem: FC<Props> = ({ channel, active }) => {
  const replacePane = usePaneReplace();
  const setPane = useSetAtom(panesAtom);
  const addPane = usePaneAdd();
  const intl = useIntl();
  const titleClose = intl.formatMessage({ defaultMessage: 'Close' });
  const titleOpenNew = intl.formatMessage({ defaultMessage: 'Open in new pane' });
  const handleClick: React.MouseEventHandler<HTMLAnchorElement> = useCallback((e) => {
    e.preventDefault();
    replacePane({ type: 'CHANNEL', channelId: channel.id }, (pane) => pane.type === 'CHANNEL');
  }, [channel.id, replacePane]);
  const handleClickInnerButton = useCallback((e: React.MouseEvent<HTMLButtonElement, MouseEvent>) => {
    e.stopPropagation();
    e.preventDefault();
    if (active) {
      setPane((panes) => panes.filter((pane) => pane.type !== 'CHANNEL' || pane.channelId !== channel.id));
    } else {
      addPane({ type: 'CHANNEL', channelId: channel.id });
    }
  }, [active, addPane, channel.id, setPane]);

  return (
    <div className="py-0.5 px-2">
      <a
        href="#" // TODO: link to channel
        className={clsx(
          'group flex items-start w-full gap-1 cursor-pointer px-1 py-1 text-sm rounded',
          active ? 'bg-surface-100 hover:bg-surface-50' : 'hover:bg-surface-50',
        )}
        onClick={handleClick}
      >
        <span
          className={clsx(
            active ? 'text-surface-900' : 'text-surface-400 group-hover:text-surface-700',
          )}
        >
          <Icon
            icon={channel.isPublic ? Hash : LockedHash}
          />
        </span>
        <span className="text-left flex-1">
          {channel.name}
        </span>
        <button
          onClick={handleClickInnerButton}
          title={active ? titleClose : titleOpenNew}
          className={clsx(
            'flex-none inline-flex items-center justify-center',
            active ? 'text-surface-400' : 'text-surface-300',
            'group-hover:text-brand-600 group-hover:bg-surface-200/50 h-5 w-5 rounded-sm',
          )}
        >
          <span
            className={clsx(
              'transform transition-transform duration-100 ',
              active ? 'rotate-0' : 'rotate-45',
            )}
          >
            <Icon icon={X} />
          </span>
        </button>
      </a>
    </div>
  );
};
