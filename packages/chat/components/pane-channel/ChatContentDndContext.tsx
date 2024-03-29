import {
  closestCenter,
  DndContext,
  DndContextProps,
  KeyboardSensor,
  MouseSensor,
  TouchSensor,
  useSensor,
  useSensors,
} from '@dnd-kit/core';
import { restrictToVerticalAxis } from '@dnd-kit/modifiers';
import { memo, ReactNode, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { DraggingItem } from './ChatContentView';
import { DraggingOverlay } from './DraggingOverlay';
import { IsDraggingContext } from '../../hooks/useIsDragging';

interface Props extends Pick<DndContextProps, 'onDragCancel' | 'onDragStart' | 'onDragEnd'> {
  children: ReactNode;
  active: DraggingItem | null;
  myId: string | null | undefined;
  iAmMaster: boolean;
}

export const ChatListDndContext = memo<Props>(({ children, iAmMaster, active, myId, ...rest }) => {
  const mouseSensor = useSensor(MouseSensor);
  const touchSensor = useSensor(TouchSensor);
  const keyboardSensor = useSensor(KeyboardSensor);
  const sensors = useSensors(mouseSensor, touchSensor, keyboardSensor);
  const modifiers = useMemo(() => [restrictToVerticalAxis], []);
  return (
    <DndContext sensors={sensors} collisionDetection={closestCenter} modifiers={modifiers} {...rest}>
      <IsDraggingContext.Provider value={!!active}>
        {children}

        {createPortal(<DraggingOverlay iAmMaster={iAmMaster} active={active} myId={myId} />, document.body)}
      </IsDraggingContext.Provider>
    </DndContext>
  );
});
ChatListDndContext.displayName = 'ChatListDndContext';
