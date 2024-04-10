import { PrimitiveAtom, useAtom, useAtomValue } from 'jotai';
import { FC } from 'react';
import { ChannelHeaderState } from './ChannelHeader';
import { ChannelHeaderFilterBar } from './ChannelHeaderFilterBar';
import { ChannelHeaderMore } from './ChannelHeaderMore';
import { ChannelHeaderEditCharacter } from './ChannelHeaderEditCharacter';

interface Props {
  channelId: string;
  stateAtom: PrimitiveAtom<ChannelHeaderState>;
}

export const ChannelHeaderExtra: FC<Props> = ({ stateAtom, channelId }) => {
  const [headerState, setHeaderState] = useAtom(stateAtom);
  switch (headerState) {
    case 'CHARACTER':
      return <ChannelHeaderEditCharacter channelId={channelId} exitEdit={() => setHeaderState('DEFAULT')} />;
    case 'MORE':
      return <ChannelHeaderMore channelId={channelId} setHeaderState={setHeaderState} />;
    case 'FILTER':
      return <ChannelHeaderFilterBar />;
    default:
      return null;
  }
};
