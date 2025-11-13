import React from 'react';

export const IsTopLevelContext = React.createContext<boolean>(true);

export function useIsTopLevel() {
  return React.useContext(IsTopLevelContext);
}
