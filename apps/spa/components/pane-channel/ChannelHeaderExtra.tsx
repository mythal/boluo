import { type PrimitiveAtom, useAtom } from 'jotai';
import { Activity, type FC } from 'react';
import { type ChannelHeaderState } from './ChannelHeader';
import { ChannelHeaderMore } from './ChannelHeaderMore';
import { ChannelHeaderTopic } from './ChannelHeaderTopic';

interface Props {
  channelId: string;
  spaceId?: string;
  stateAtom: PrimitiveAtom<ChannelHeaderState>;
}

export const ChannelHeaderExtra: FC<Props> = ({ stateAtom, channelId, spaceId }) => {
  const [headerState, setHeaderState] = useAtom(stateAtom);
  const dismiss = () => setHeaderState('DEFAULT');
  return (
    <>
      <Activity mode={headerState === 'MORE' ? 'visible' : 'hidden'}>
        <ChannelHeaderMore
          channelId={channelId}
          spaceId={spaceId}
          setHeaderState={setHeaderState}
        />
      </Activity>
      <Activity mode={headerState === 'TOPIC' ? 'visible' : 'hidden'}>
        <ChannelHeaderTopic channelId={channelId} spaceId={spaceId} dismiss={dismiss} />
      </Activity>
    </>
  );
};
