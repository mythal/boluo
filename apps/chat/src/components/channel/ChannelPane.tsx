import clsx from 'clsx';
import { useMe } from 'common';
import { atomWithReducer } from 'jotai/utils';
import { FC, useMemo } from 'react';
import { memo } from 'react';
import { ComposeAtomContext } from '../../hooks/useComposeAtom';
import { useMyChannelMember } from '../../hooks/useMyChannelMember';
import { composeReducer, makeInitialComposeState } from '../../state/compose.reducer';
import { Compose } from '../compose/Compose';
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
  const initialCompose = useMemo(makeInitialComposeState, []);
  const composeAtom = useMemo(() => atomWithReducer(initialCompose, composeReducer), [initialCompose]);
  const nickname = me?.user.nickname;
  useSendPreview(channelId, nickname, composeAtom);
  return (
    <ComposeAtomContext.Provider value={composeAtom}>
      <PaneBox>
        <ChannelHeader />
        <PaneBodyBox className={clsx('flex-col justify-between flex flex-grow relative')}>
          <ChatContent className="relative flex-grow" me={me} channelId={channelId} />
          {me && member
            ? <Compose me={me} className={clsx('p-2 border-t')} />
            : null}
        </PaneBodyBox>
      </PaneBox>
    </ComposeAtomContext.Provider>
  );
});
ChatPaneChannel.displayName = 'ChatPaneChannel';
