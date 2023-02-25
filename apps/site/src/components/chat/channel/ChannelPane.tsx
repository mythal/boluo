import clsx from 'clsx';
import type { FC } from 'react';
import { memo } from 'react';
import { useMe } from '../../../hooks/useMe';
import { Compose } from '../compose/Compose';
import { GuestCompose } from '../compose/GuestCompose';
import { PaneBodyBox } from '../PaneBodyBox';
import { ChannelHeader } from './ChannelHeader';
import { MessageList } from './MessageList';

interface Props {
}

export const ChatPaneChannel: FC<Props> = memo(({}) => {
  const me = useMe();
  return (
    <>
      <ChannelHeader />
      <PaneBodyBox className={clsx('flex-col justify-between flex')}>
        <MessageList className="relative flex-grow" />
        {me
          ? <Compose me={me} className={clsx('m-2 max-h-[8rem]')} />
          : <GuestCompose />}
      </PaneBodyBox>
    </>
  );
});
ChatPaneChannel.displayName = 'ChatPaneChannel';
