import { useChannel } from './useChannel';

export const useDefaultRollCommand = (): string => {
  const channel = useChannel();
  return channel?.defaultRollCommand || 'd';
};
