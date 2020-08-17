import { Information, InformationLevel } from '../information';
import { ReactNode } from 'react';
import { Dispatch } from '../store';
import { Id, newId } from '../utils/id';

export interface ShowFlash {
  type: 'SHOW_FLASH';
  information: Information;
}

export interface DismissFlash {
  type: 'DISMISS_FLASH';
  id: Id;
}

export const dismissFlash = (id: Id): DismissFlash => ({
  type: 'DISMISS_FLASH',
  id,
});

export const showFlash = (level: InformationLevel, content: ReactNode, timeout: number | null = 5000) => (
  dispatch: Dispatch
) => {
  const id = newId();
  dispatch({
    type: 'SHOW_FLASH',
    information: { content, level, id },
  });
  if (timeout !== null) {
    setTimeout(() => {
      dispatch({
        type: 'DISMISS_FLASH',
        id,
      });
    }, timeout);
  }
};
