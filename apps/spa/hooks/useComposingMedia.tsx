import { useAtomValue } from 'jotai';
import { selectAtom } from 'jotai/utils';
import { useMemo } from 'react';
import { useComposeAtom } from './useComposeAtom';

export const useComposingMedia = () => {
  const composeAtom = useComposeAtom();
  const mediaAtom = useMemo(() => selectAtom(composeAtom, (compose) => compose.media), [composeAtom]);
  return useAtomValue(mediaAtom);
};
