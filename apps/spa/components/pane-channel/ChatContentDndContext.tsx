import {
  closestCenter,
  DndContext,
  type DndContextProps,
  KeyboardSensor,
  MouseSensor,
  TouchSensor,
  useSensor,
  useSensors,
} from '@dnd-kit/core';
import { restrictToVerticalAxis } from '@dnd-kit/modifiers';
import { type FC, type ReactNode, useMemo } from 'react';
import { createPortal } from 'react-dom';
import type { DraggingItem } from './ChatContentView';
import { DraggingOverlay } from './DraggingOverlay';
import { IsDraggingContext } from '../../hooks/useIsDragging';

interface Props extends Pick<DndContextProps, 'onDragCancel' | 'onDragStart' | 'onDragEnd'> {
  children: ReactNode;
  active: DraggingItem | null;
}

export const ChatListDndContext: FC<Props> = ({ children, active, ...rest }) => {
  const mouseSensor = useSensor(MouseSensor);
  const touchSensor = useSensor(TouchSensor);
  const keyboardSensor = useSensor(KeyboardSensor);
  const sensors = useSensors(mouseSensor, touchSensor, keyboardSensor);
  const modifiers = useMemo(() => [restrictToVerticalAxis], []);
  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCenter}
      modifiers={modifiers}
      {...rest}
    >
      <IsDraggingContext value={!!active}>
        {children}

        {createPortal(<DraggingOverlay active={active} />, document.body)}
      </IsDraggingContext>
    </DndContext>
  );
};
