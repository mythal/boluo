import type { Channel, ChannelType } from '@boluo/api';
import clsx from 'clsx';
import { Drama, Hash, Lock, MoveVertical } from '@boluo/icons';
import { type Atom, atom, useAtomValue } from 'jotai';
import { type FC, useCallback, useMemo } from 'react';
import { useIntl } from 'react-intl';
import Icon from '@boluo/ui/Icon';
import { usePaneReplace } from '../../hooks/usePaneReplace';
import { paneHrefWithRoute } from '../../href';
import { chatAtom } from '../../state/chat.atoms';
import { channelReadFamily } from '../../state/unread.atoms';
import { useIsReordering } from '../../hooks/useIsReordering';
import { findLast, last } from 'list';
import { type MessageItem } from '../../state/channel.types';
import { SidebarChannelItemPreview } from './SidebarChannelItemPreview';
import { SidebarChannelItemOrderableBox } from '../SidebarChannelItemOrderableBox';
import { SidebarChannelItemButtons } from './SidebarChannelItemButtons';

interface Props {
  channel: Channel;
  active: boolean;
  overlay?: boolean;
  myId: string | null | undefined;
}
export type LatestMessageAtom = Atom<'UNLOAD' | 'EMPTY' | MessageItem>;

const styles = {
  container: clsx('px-3 py-0.5'),
  item: clsx(
    'group relative w-full py-1.5 text-sm px-1 rounded',
    'grid gap-1 grid-cols-[1.25rem_1fr_auto] grid-rows-[auto_auto] items-start',
  ),
};

export const SidebarChannelItem: FC<Props> = ({ channel, active, overlay = false, myId }) => {
  const replacePane = usePaneReplace();
  const intl = useIntl();
  const isReordering = useIsReordering();

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
  const channelHref = paneHrefWithRoute(channel.spaceId, {
    type: 'CHANNEL',
    channelId: channel.id,
  });
  const iconButton = useMemo(
    () => (
      <button
        className={clsx(
          'group/icon relative h-full',
          active ? 'text-text-primary' : 'text-text-subtle group-hover:text-text-secondary',
          isReordering ? 'cursor-grab' : '',
        )}
        aria-label={isReordering ? labelReorder : undefined}
      >
        <ChannelItemIcon channelType={channel.type} isReordering={isReordering} />
      </button>
    ),
    [active, channel.type, isReordering, labelReorder],
  );
  const channelName = (
    <span className="text-left">
      {channel.isPublic ? '' : <Icon className="text-text-secondary mr-1" icon={Lock} />}
      <span className="font-semibold">{channel.name}</span>
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
  const buttons = useMemo(
    () => (
      <div className="absolute right-0 opacity-0 group-hover:opacity-100">
        <SidebarChannelItemButtons active={active} channelId={channel.id} />
      </div>
    ),
    [active, channel.id],
  );
  if (isReordering) {
    return (
      <SidebarChannelItemOrderableBox
        channelId={channel.id}
        ordering={isReordering}
        overlay={overlay}
      >
        <div className={styles.container}>
          <span
            className={clsx(styles.item, 'bg-sidebar-item-hover-bg cursor-grab')}
            onClick={handleClick}
          >
            {iconButton}
            {channelName}
            {messagePreview}
          </span>
        </div>
      </SidebarChannelItemOrderableBox>
    );
  }

  return (
    <SidebarChannelItemOrderableBox
      channelId={channel.id}
      ordering={isReordering}
      overlay={overlay}
    >
      <div className={styles.container}>
        <a
          href={channelHref}
          className={clsx(
            styles.item,
            'cursor-pointer',
            active ? 'bg-sidebar-item-active-bg' : 'hover:bg-sidebar-item-hover-bg',
          )}
          onClick={handleClick}
        >
          {iconButton}
          {channelName}
          {messagePreview}
          {buttons}
        </a>
      </div>
    </SidebarChannelItemOrderableBox>
  );
};

const ChannelItemIcon: FC<{ channelType: ChannelType; isReordering: boolean }> = ({
  channelType,
  isReordering,
}) => {
  let icon = Hash;
  if (isReordering) {
    icon = MoveVertical;
  } else if (channelType === 'IN_GAME') {
    icon = Drama;
  }
  return <Icon className="ChannelItemIcon" icon={icon} />;
};
