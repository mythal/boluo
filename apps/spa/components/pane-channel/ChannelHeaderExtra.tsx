import { PrimitiveAtom, useAtom } from 'jotai';
import { FC } from 'react';
import { ChannelHeaderState } from './ChannelHeader';
import { ChannelHeaderMore } from './ChannelHeaderMore';

interface Props {
  channelId: string;
  stateAtom: PrimitiveAtom<ChannelHeaderState>;
}

export const ChannelHeaderExtra: FC<Props> = ({ stateAtom, channelId }) => {
  const [headerState, setHeaderState] = useAtom(stateAtom);
  switch (headerState) {
    case 'MORE':
      return <ChannelHeaderMore channelId={channelId} setHeaderState={setHeaderState} />;
    default:
      return null;
  }
};
