import * as React from 'react';
import { useUpdateAtom } from 'jotai/utils';
import { sourceAtom } from './state';
import { useCallback } from 'react';
import { useChannelId } from '../../../hooks/useChannelId';
import { useSelector } from '../../../store';
import Button from '../../atoms/Button';
import { mL } from '../../../styles/atoms';

export const AddDiceButton = () => {
  const channelId = useChannelId();
  const defaultDice = useSelector((state) => state.chatStates.get(channelId)?.channel.defaultDiceType ?? 'd');

  const setSource = useUpdateAtom(sourceAtom, channelId);
  const addDice = useCallback(() => {
    setSource((source) => source + '{' + defaultDice + '}');
  }, [setSource]);
  return (
    <Button css={[mL(1)]} data-size="small" onClick={addDice}>
      添加骰子
    </Button>
  );
};
