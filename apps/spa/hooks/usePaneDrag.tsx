import { createContext, useContext } from 'react';
import { type PointerEvent as ReactPointerEvent } from 'react';

export interface PaneDragContextValue {
  canDrag: boolean;
  draggingPane?: { key: number; isChild: boolean } | null;
  onHandlePointerDown?: (
    paneKey: number,
    isChild: boolean,
    event: ReactPointerEvent<HTMLElement>,
  ) => void;
  registerPaneRef?: (paneKey: number, node: HTMLDivElement | null) => void;
}

const defaultPaneDragContext: PaneDragContextValue = {
  canDrag: false,
  draggingPane: null,
};

export const PaneDragContext = createContext<PaneDragContextValue>(defaultPaneDragContext);
export const PaneDragProvider = PaneDragContext.Provider;
export const usePaneDrag = () => useContext(PaneDragContext);
