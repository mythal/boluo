import { ChannelAtoms, useChannelAtoms } from './useChannelAtoms';

export type ComposeAtom = ChannelAtoms['composeAtom'];

export const useComposeAtom = (): ChannelAtoms['composeAtom'] => {
  return useChannelAtoms().composeAtom;
};
