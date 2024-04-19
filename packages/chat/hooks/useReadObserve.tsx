import React from 'react';

export const ReadObserverContext = React.createContext<(node: Element) => () => void>(() => {
  console.warn('ReadObserverContext is not provided');
  return () => {};
});

export const useReadObserve = () => {
  return React.useContext(ReadObserverContext);
};
