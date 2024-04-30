import { forwardRef } from 'react';
import type { ListProps } from 'react-virtuoso';

export const ChatContentList = forwardRef<HTMLDivElement, ListProps>(({ children, ...props }, ref) => (
  <div ref={ref} className="" {...props}>
    {children}
  </div>
));
ChatContentList.displayName = 'ChatContentList';
