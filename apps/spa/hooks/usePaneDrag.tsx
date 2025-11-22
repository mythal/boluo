import { createContext, useContext } from 'react';
import { type PointerEvent as ReactPointerEvent } from 'react';

export interface PaneDragContextValue {
  canDrag: boolean;
  draggingKey: number | null;
  onHandlePointerDown?: (paneKey: number, event: ReactPointerEvent<HTMLElement>) => void;
  registerPaneRef?: (paneKey: number, node: HTMLDivElement | null) => void;
}

const defaultPaneDragContext: PaneDragContextValue = {
  canDrag: false,
  draggingKey: null,
};

export const PaneDragContext = createContext<PaneDragContextValue>(defaultPaneDragContext);
export const PaneDragProvider = PaneDragContext.Provider;
export const usePaneDrag = () => useContext(PaneDragContext);
