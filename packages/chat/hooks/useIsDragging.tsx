import { createContext, useContext } from 'react';

export const IsDraggingContext = createContext(false);

export const useIsDragging = () => {
  const isDragging = useContext(IsDraggingContext);
  return isDragging;
};
