import { PrimitiveAtom, useAtom, useAtomValue } from 'jotai';
import { FC, useCallback } from 'react';
import { ChannelHeaderState } from './ChannelHeader';
import { ChannelHeaderFilterBar } from './ChannelHeaderFilterBar';
import { ChannelHeaderMore } from './ChannelHeaderMore';

interface Props {
  channelId: string;
  stateAtom: PrimitiveAtom<ChannelHeaderState>;
}

export const ChannelHeaderExtra: FC<Props> = ({ stateAtom, channelId }) => {
  const [headerState, setHeaderState] = useAtom(stateAtom);
  const resetHeaderState = useCallback(() => {
    setHeaderState('DEFAULT');
  }, [setHeaderState]);
  if (headerState === 'MORE') {
    return <ChannelHeaderMore channelId={channelId} resetHeaderState={resetHeaderState} />;
  } else if (headerState === 'FILTER') {
    return <ChannelHeaderFilterBar />;
  }
  return null;
};
