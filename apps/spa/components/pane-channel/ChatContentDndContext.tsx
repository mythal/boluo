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
import { FC, ReactNode, useMemo } from 'react';
import { createPortal } from 'react-dom';
import type { DraggingItem } from './ChatContentView';
import { DraggingOverlay } from './DraggingOverlay';
import { IsDraggingContext } from '../../hooks/useIsDragging';
import { ResolvedTheme } from '@boluo/theme';

interface Props extends Pick<DndContextProps, 'onDragCancel' | 'onDragStart' | 'onDragEnd'> {
  children: ReactNode;
  active: DraggingItem | null;
  myId: string | null | undefined;
  iAmMaster: boolean;
  theme: ResolvedTheme;
}

export const ChatListDndContext: FC<Props> = ({ children, iAmMaster, active, myId, theme, ...rest }) => {
  const mouseSensor = useSensor(MouseSensor);
  const touchSensor = useSensor(TouchSensor);
  const keyboardSensor = useSensor(KeyboardSensor);
  const sensors = useSensors(mouseSensor, touchSensor, keyboardSensor);
  const modifiers = useMemo(() => [restrictToVerticalAxis], []);
  return (
    <DndContext sensors={sensors} collisionDetection={closestCenter} modifiers={modifiers} {...rest}>
      <IsDraggingContext.Provider value={!!active}>
        {children}

        {createPortal(
          <DraggingOverlay theme={theme} iAmMaster={iAmMaster} active={active} myId={myId} />,
          document.body,
        )}
      </IsDraggingContext.Provider>
    </DndContext>
  );
};
