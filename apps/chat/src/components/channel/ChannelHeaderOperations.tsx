import { PrimitiveAtom, useAtom } from 'jotai';
import { FC, useCallback } from 'react';
import { ClosePaneButton } from '../ClosePaneButton';
import { ChannelHeaderState } from './ChannelHeader';
import { ChannelHeaderFilterButton } from './ChannelHeaderFilterButton';
import { ChannelHeaderMoreButton } from './ChannelHeaderMenuButton';
import { ChannelHeaderSplitPaneButton } from './ChannelHeaderSplitPaneButton';

interface Props {
  stateAtom: PrimitiveAtom<ChannelHeaderState>;
}

export const ChannelHeaderOperations: FC<Props> = ({ stateAtom }) => {
  const [state, setState] = useAtom(stateAtom);
  const toggleMore = useCallback(() => setState(prev => prev === 'MORE' ? 'DEFAULT' : 'MORE'), [setState]);
  const toggleFilterBar = useCallback(() => setState(prev => prev === 'FILTER' ? 'DEFAULT' : 'FILTER'), [setState]);
  return (
    <>
      <ChannelHeaderMoreButton on={state === 'MORE'} toggle={toggleMore} />
      <ChannelHeaderFilterButton on={state === 'FILTER'} toggle={toggleFilterBar} />
      <ChannelHeaderSplitPaneButton />
      <ClosePaneButton />
    </>
  );
};
