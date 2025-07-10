import * as React from 'react';
import { useCallback } from 'react';
import D20 from '../../../assets/icons/d20.svg';
import { useChannelId } from '../../../hooks/useChannelId';
import { useDispatch, useSelector } from '../../../store';
import { mL } from '../../../styles/atoms';
import ChatItemToolbarButton from '../ChatItemToolbarButton';

interface Props {
  inCompose?: boolean;
  className?: string;
}

export const AddDiceButton = ({ inCompose = false, className }: Props) => {
  const channelId = useChannelId();
  const dispatch = useDispatch();
  const dice = useSelector(
    (state) => state.chatStates.get(channelId)?.channel.defaultRollCommand ?? 'd',
  );

  const addDice = useCallback(() => {
    dispatch({ type: 'ADD_DICE', pane: channelId, dice });
  }, [channelId, dice, dispatch]);
  return (
    <ChatItemToolbarButton
      className={className}
      css={mL(1)}
      size={inCompose ? 'large' : 'normal'}
      onClick={addDice}
      title="添加骰子"
      icon={D20}
    />
  );
};
