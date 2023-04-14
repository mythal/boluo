import clsx from 'clsx';
import { useMe } from 'common';
import { atomWithReducer } from 'jotai/utils';
import { FC, useCallback, useMemo, useRef } from 'react';
import { memo } from 'react';
import { useChannelId } from '../../hooks/useChannelId';
import { ComposeAtomContext } from '../../hooks/useComposeAtom';
import { useMyChannelMember } from '../../hooks/useMyChannelMember';
import { composeReducer, initialComposeState } from '../../state/compose';
import { Compose } from '../compose/Compose';
import { GuestCompose } from '../compose/GuestCompose';
import { SendRef } from '../compose/SendButton';
import { useSendPreview } from '../compose/useSendPreview';
import { PaneBodyBox } from '../PaneBodyBox';
import { PaneBox } from '../PaneBox';
import { ChannelHeader } from './ChannelHeader';
import { ChatList } from './ChatList';
import { SendContext } from './useSend';

interface Props {
}

export const ChatPaneChannel: FC<Props> = memo(({}) => {
  const sendRef = useRef<SendRef | null>(null);
  const send = useCallback(() => sendRef.current?.send(), []);
  const me = useMe();
  const channelId = useChannelId();
  const member = useMyChannelMember(channelId);
  const composeAtom = useMemo(() => atomWithReducer(initialComposeState, composeReducer), []);
  const nickname = me?.user.nickname;
  useSendPreview(channelId, nickname, composeAtom);
  return (
    <ComposeAtomContext.Provider value={composeAtom}>
      <SendContext.Provider value={send}>
        <PaneBox>
          <ChannelHeader />
          <PaneBodyBox className={clsx('flex-col justify-between flex flex-grow')}>
            <ChatList className="relative flex-grow" />
            {me && member
              ? <Compose me={me} className={clsx('m-2 max-h-[8rem]')} sendRef={sendRef} />
              : <GuestCompose />}
          </PaneBodyBox>
        </PaneBox>
      </SendContext.Provider>
    </ComposeAtomContext.Provider>
  );
});
ChatPaneChannel.displayName = 'ChatPaneChannel';
