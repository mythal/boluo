import * as React from 'react';
import { useUpdateAtom } from 'jotai/utils';
import { sourceAtom } from './state';
import { useCallback } from 'react';
import { useChannelId } from '../../../hooks/useChannelId';
import { useSelector } from '../../../store';
import Button from '../../atoms/Button';
import { mL } from '../../../styles/atoms';
import ChatItemToolbarButton from '../ChatItemToolbarButton';
import diceIcon from '../../../assets/icons/d20.svg';

interface Props {
  inCompose?: boolean;
  className?: string;
}

export const AddDiceButton = ({ inCompose = false, className }: Props) => {
  const channelId = useChannelId();
  const defaultDice = useSelector((state) => state.chatStates.get(channelId)?.channel.defaultRollCommand ?? 'd');

  const setSource = useUpdateAtom(sourceAtom, channelId);
  const addDice = useCallback(() => {
    setSource((source) => source + ' {' + defaultDice + '}');
  }, [setSource]);
  return (
    <ChatItemToolbarButton
      className={className}
      css={mL(1)}
      size={inCompose ? 'large' : 'normal'}
      onClick={addDice}
      title="添加骰子"
      sprite={diceIcon}
    />
  );
};
