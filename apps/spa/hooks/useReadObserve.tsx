import React from 'react';
import { recordWarn } from '../error';

export const ReadObserverContext = React.createContext<(node: Element) => () => void>(() => {
  recordWarn('ReadObserverContext is not provided');
  return () => {};
});

export const useReadObserve = () => {
  return React.useContext(ReadObserverContext);
};
