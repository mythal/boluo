import clsx from 'clsx';
import type { FC } from 'react';
import { useMemo } from 'react';
import { useChannelId } from '../../../hooks/useChannelId';
import { useMe } from '../../../hooks/useMe';
import { useIsFocused } from '../../../state/panes';
import { Compose } from '../compose/Compose';
import { GuestCompose } from '../compose/GuestCompose';
import { PaneBodyBox } from '../PaneBodyBox';
import { ChannelHeader } from './ChannelHeader';
import { MessageList } from './MessageList';

interface Props {
}

interface ViewProps {
  channelId: string;
}

const ChatPaneChannelView: FC<ViewProps> = ({ channelId }) => {
  const me = useMe();
  return (
    <>
      <ChannelHeader />
      <PaneBodyBox className={clsx('flex-col justify-between flex')}>
        <MessageList channelId={channelId} className="relative flex-grow" />
        {me
          ? <Compose me={me} className={clsx('m-2 max-h-[8rem]')} />
          : <GuestCompose />}
      </PaneBodyBox>
    </>
  );
};

export const ChatPaneChannel: FC<Props> = () => {
  const channelId = useChannelId();
  return useMemo(() => <ChatPaneChannelView channelId={channelId} />, [channelId]);
};
