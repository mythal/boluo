import { useChannel } from './useChannel';

export const useDefaultInGame = (): boolean => {
  const channel = useChannel();
  return channel?.type === 'IN_GAME';
};
