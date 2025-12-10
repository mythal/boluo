import React, { useContext } from 'react';
import { type Id } from '../utils/id';

export interface PaneInfo {
  id: Id;
  split: () => void;
  close?: () => void;
  isFocused: boolean;
}

export const PaneContext = React.createContext<PaneInfo | undefined>(undefined);

export function useChannelId(): Id {
  const pane = useContext(PaneContext);
  if (pane === undefined) {
    throw new Error('use a uninitialized pane context');
  }
  return pane.id;
}

export function usePane(): PaneInfo {
  const pane = useContext(PaneContext);
  if (pane === undefined) {
    throw new Error('use a uninitialized pane context');
  }
  return pane;
}
