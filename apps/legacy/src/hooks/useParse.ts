import { useCallback } from 'react';
import { parse, type ParseResult } from '../interpreter/parser';
import { useSelector } from '../store';
import { getDiceFace } from '../utils/game';
import { useChannelId } from './useChannelId';

export const useParse = (parseExpr = true): ((source: string) => ParseResult) => {
  const pane = useChannelId();
  const chatDiceType = useSelector((state) => state.chatStates.get(pane)?.channel.defaultDiceType);
  const defaultDiceFace = chatDiceType ? getDiceFace(chatDiceType) : 20;
  return useCallback(
    (source: string) =>
      parse(source, parseExpr, {
        defaultDiceFace,
        resolveUsername: () => null,
      }),
    [parseExpr, defaultDiceFace],
  );
};
