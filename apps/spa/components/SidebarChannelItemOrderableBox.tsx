import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { type FC } from 'react';

interface Props {
  channelId: string;
  ordering: boolean;
  overlay?: boolean;
  children?: React.ReactNode;
}

export const SidebarChannelItemOrderableBox: FC<Props> = ({
  channelId,
  ordering,
  overlay = false,
  children,
}) => {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: channelId,
    disabled: !ordering,
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };
  if (ordering) {
    return (
      <div
        ref={setNodeRef}
        style={style}
        {...attributes}
        {...listeners}
        className={`SidebarChannelItemOrderableBox ${isDragging ? 'opacity-0' : ''} ${overlay ? 'cursor-grabbing opacity-75' : 'cursor-grab'}`}
      >
        {children}
      </div>
    );
  }

  return <div className="SidebarChannelItemOrderableBox relative">{children}</div>;
};
