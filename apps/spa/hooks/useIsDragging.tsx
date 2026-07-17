import { createContext, use } from 'react';

export const IsDraggingContext = createContext(false);

export const useIsDragging = () => {
  const isDragging = use(IsDraggingContext);
  return isDragging;
};
