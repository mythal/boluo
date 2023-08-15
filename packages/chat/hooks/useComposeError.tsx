import { ChannelMember } from 'api';
import { useAtomValue } from 'jotai';
import { ComposeError } from '../state/compose.reducer';
import { useChannelAtoms } from './useChannelAtoms';

export const useComposeError = (member: ChannelMember): ComposeError | null => {
  const { checkComposeAtom } = useChannelAtoms();
  let composeError = useAtomValue(checkComposeAtom);
  if (composeError === 'NO_NAME' && member.characterName !== '') {
    composeError = null;
  }
  return composeError;
};
