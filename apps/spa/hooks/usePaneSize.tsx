import React from 'react';

export type PaneSize = 'SMALL' | 'NORMAL';

export const PaneSizeContext = React.createContext<PaneSize>('NORMAL');

export const usePaneSize = (): PaneSize => React.useContext(PaneSizeContext);
