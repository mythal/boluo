import { useAtomValue } from 'jotai';
import { useChannelAtoms } from './useChannelAtoms';
import type { ComposeIssue } from '../state/compose-issues';

export const useComposeIssues = (): ComposeIssue[] => {
  const { composeIssuesAtom } = useChannelAtoms();
  return useAtomValue(composeIssuesAtom);
};
