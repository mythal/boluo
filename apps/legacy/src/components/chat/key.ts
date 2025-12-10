import type * as React from 'react';

let submitKeyHandle: number | undefined = undefined;

const submitKey = (callback: () => void) => {
  window.clearTimeout(submitKeyHandle);
  submitKeyHandle = window.setTimeout(callback, 200);
};

export const handleKeyDown = (
  onSend: () => void,
  toggleInGame: () => void,
  enterSend: boolean | undefined,
): React.KeyboardEventHandler => {
  return (e) => {
    if (enterSend && e.key === 'Enter' && !e.shiftKey) {
      if (!e.ctrlKey) {
        e.preventDefault();
        submitKey(() => onSend());
      }
    } else if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') {
      e.preventDefault();
      submitKey(() => onSend());
    } else if (e.key === 'Escape') {
      e.preventDefault();
      submitKey(() => toggleInGame());
    }
  };
};
