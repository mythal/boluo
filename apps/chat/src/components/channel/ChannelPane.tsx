import clsx from 'clsx';
import { useMe } from 'common';
import type { FC } from 'react';
import { memo } from 'react';
import { Compose } from '../compose/Compose';
import { GuestCompose } from '../compose/GuestCompose';
import { PaneBodyBox } from '../PaneBodyBox';
import { PaneBox } from '../PaneBox';
import { ChannelHeader } from './ChannelHeader';
import { ChatList } from './ChatList';

interface Props {
}

export const ChatPaneChannel: FC<Props> = memo(({}) => {
  const me = useMe();
  return (
    <PaneBox>
      <ChannelHeader />
      <PaneBodyBox className={clsx('flex-col justify-between flex flex-grow')}>
        <ChatList className="relative flex-grow" />
        {me
          ? <Compose me={me} className={clsx('m-2 max-h-[8rem]')} />
          : <GuestCompose />}
      </PaneBodyBox>
    </PaneBox>
  );
});
ChatPaneChannel.displayName = 'ChatPaneChannel';
