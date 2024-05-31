import { useAtomValue } from 'jotai';
import { type ComposeError } from '../state/compose.reducer';
import { useChannelAtoms } from './useChannelAtoms';

export const useComposeError = (): ComposeError | null => {
  const { checkComposeAtom } = useChannelAtoms();
  return useAtomValue(checkComposeAtom);
};
