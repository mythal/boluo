import { PrimitiveAtom, useAtomValue } from 'jotai';
import { FC } from 'react';
import { ChannelHeaderState } from './ChannelHeader';
import { ChannelHeaderFilterBar } from './ChannelHeaderFilterBar';
import { ChannelHeaderMore } from './ChannelHeaderMore';

interface Props {
  channelId: string;
  stateAtom: PrimitiveAtom<ChannelHeaderState>;
}

export const ChannelHeaderExtra: FC<Props> = ({ stateAtom, channelId }) => {
  const state = useAtomValue(stateAtom);
  if (state === 'MORE') {
    return <ChannelHeaderMore channelId={channelId} />;
  } else if (state === 'FILTER') {
    return <ChannelHeaderFilterBar />;
  }
  return null;
};
