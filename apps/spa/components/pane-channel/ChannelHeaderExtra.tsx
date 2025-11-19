import { type PrimitiveAtom, useAtom } from 'jotai';
import { type FC } from 'react';
import { type ChannelHeaderState } from './ChannelHeader';
import { ChannelHeaderMore } from './ChannelHeaderMore';
import { ChannelHeaderTopic } from './ChannelHeaderTopic';

interface Props {
  channelId: string;
  stateAtom: PrimitiveAtom<ChannelHeaderState>;
}

export const ChannelHeaderExtra: FC<Props> = ({ stateAtom, channelId }) => {
  const [headerState, setHeaderState] = useAtom(stateAtom);
  const dismiss = () => setHeaderState('DEFAULT');
  switch (headerState) {
    case 'MORE':
      return <ChannelHeaderMore channelId={channelId} setHeaderState={setHeaderState} />;
    case 'TOPIC':
      return <ChannelHeaderTopic channelId={channelId} dismiss={dismiss} />;
    default:
      return null;
  }
};
