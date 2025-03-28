import React, { type RefObject } from 'react';

export const BannerContext = React.createContext<RefObject<HTMLDivElement | null>>({
  current: null,
});

export const useBannerNode = (): HTMLDivElement | null => React.useContext(BannerContext).current;
