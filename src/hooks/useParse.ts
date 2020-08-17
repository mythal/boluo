import { parse, ParseResult } from '../interpreter/parser';
import { useSelector } from '../store';
import { getDiceFace } from '../utils/game';
import { useCallback } from 'react';

export const useParse = (parseExpr = true): ((source: string) => ParseResult) => {
  const chatDiceType = useSelector((state) => state.chat?.channel.defaultDiceType);
  const defaultDiceFace = chatDiceType ? getDiceFace(chatDiceType) : 20;
  return useCallback(
    (source: string) =>
      parse(source, parseExpr, {
        defaultDiceFace,
        resolveUsername: () => null,
      }),
    [parseExpr, defaultDiceFace]
  );
};
