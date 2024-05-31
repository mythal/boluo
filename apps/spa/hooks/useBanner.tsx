import { createContext, type ReactNode, useContext } from 'react';

export interface Banner {
  level?: 'ERROR' | 'WARNING' | 'INFO';
  content: ReactNode;
}

export const emptyBanner: Banner = {
  content: null,
  level: 'INFO',
};

export const PaneBannerContext = createContext<Banner>(emptyBanner);
export const ThrowBanner = createContext<(banner: Banner | null) => void>(() => emptyBanner);

export function usePaneBanner(): Banner {
  return useContext(PaneBannerContext);
}

export function useSetBanner(): (banner: Banner | null) => void {
  return useContext(ThrowBanner);
}
