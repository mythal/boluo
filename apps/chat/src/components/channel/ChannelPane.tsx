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
import { useSendPreview } from '../compose/useSendPreview';
import { PaneBodyBox } from '../PaneBodyBox';
import { PaneBox } from '../PaneBox';
import { ChannelHeader } from './ChannelHeader';
import { ChatContent } from './ChatContent';

interface Props {
  channelId: string;
}

export const ChatPaneChannel: FC<Props> = memo(({ channelId }) => {
  const me = useMe();
  const member = useMyChannelMember(channelId);
  const composeAtom = useMemo(() => atomWithReducer(initialComposeState, composeReducer), []);
  const nickname = me?.user.nickname;
  useSendPreview(channelId, nickname, composeAtom);
  return (
    <ComposeAtomContext.Provider value={composeAtom}>
      <PaneBox>
        <ChannelHeader />
        <PaneBodyBox className={clsx('flex-col justify-between flex flex-grow')}>
          <ChatContent className="relative flex-grow" me={me} channelId={channelId} />
          {me && member
            ? <Compose me={me} className={clsx('m-2 max-h-[8rem]')} />
            : <GuestCompose />}
        </PaneBodyBox>
      </PaneBox>
    </ComposeAtomContext.Provider>
  );
});
ChatPaneChannel.displayName = 'ChatPaneChannel';
