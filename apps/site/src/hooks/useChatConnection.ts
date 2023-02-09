import { useContext } from 'react';
import type { ConnectionState } from '../state/connection';
import { createConnectionStateContext } from '../state/connection';

export const SpaceConnectionStateContext = createConnectionStateContext();

export const useChatConnection = (): ConnectionState => {
  return useContext(SpaceConnectionStateContext);
};
