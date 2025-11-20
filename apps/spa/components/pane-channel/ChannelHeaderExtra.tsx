import { type PrimitiveAtom, useAtom } from 'jotai';
import { Activity, type FC } from 'react';
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
  return (
    <>
      <Activity mode={headerState === 'MORE' ? 'visible' : 'hidden'}>
        <ChannelHeaderMore channelId={channelId} setHeaderState={setHeaderState} />
      </Activity>
      <Activity mode={headerState === 'TOPIC' ? 'visible' : 'hidden'}>
        <ChannelHeaderTopic channelId={channelId} dismiss={dismiss} />
      </Activity>
    </>
  );
};
