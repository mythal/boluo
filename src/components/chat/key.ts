import * as React from 'react';
import { ComposeDispatch, update } from './compose/reducer';

export const handleKeyDown = (
  composeDispatch: ComposeDispatch,
  onSend: () => void,
  inGame: boolean
): React.KeyboardEventHandler => {
  return async (e) => {
    if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') {
      e.preventDefault();
      await onSend();
    } else if (e.key === 'Alt') {
      e.preventDefault();
      composeDispatch(update({ inGame: !inGame }));
    }
  };
};
