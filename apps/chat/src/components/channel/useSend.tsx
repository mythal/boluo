import { createContext, useContext } from 'react';

export const SendContext = createContext<() => void>(() => {
  console.error('Invaild `send`');
});

export const useSend = (): () => void => {
  return useContext(SendContext);
};
