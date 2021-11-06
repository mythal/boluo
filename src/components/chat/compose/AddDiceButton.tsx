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

export const AddDiceButton = () => {
  const channelId = useChannelId();
  const defaultDice = useSelector((state) => state.chatStates.get(channelId)?.channel.defaultRollCommand ?? 'd');

  const setSource = useUpdateAtom(sourceAtom, channelId);
  const addDice = useCallback(() => {
    setSource((source) => source + ' {' + defaultDice + '}');
  }, [setSource]);
  return <ChatItemToolbarButton css={mL(1)} onClick={addDice} title="添加骰子" sprite={diceIcon} />;
};
