import { useChannel } from './useChannel';

export const useIsInGameChannel = () => useChannel()?.type === 'IN_GAME';
