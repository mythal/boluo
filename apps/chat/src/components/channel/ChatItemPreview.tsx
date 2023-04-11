import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { Preview } from 'api';
import clsx from 'clsx';
import type { FC } from 'react';
import { OthersPreview } from './OthersPreview';
import { PreviewHandlePlaceHolder } from './PreviewHandlePlaceHolder';
import { SelfPreview } from './SelfPreview';

interface Props {
  preview: Preview;
  className?: string;
  self: boolean;
}

export const ChatItemPreview: FC<Props> = ({ preview, className = '', self }) => {
  const {
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: preview.id, disabled: true });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };
  return (
    <div
      className={clsx(
        'grid py-2 px-2 items-start group gap-x-2 gap-y-1 grid-flow-col grid-rows-[auto_auto]',
        'grid-cols-[2rem_minmax(0,1fr)]',
        '@2xl:grid-cols-[2rem_12rem_minmax(0,1fr)] @2xl:grid-rows-1',
        isDragging && 'opacity-0',
        className,
      )}
      ref={setNodeRef}
      style={style}
    >
      <PreviewHandlePlaceHolder />
      {self ? <SelfPreview preview={preview} /> : <OthersPreview preview={preview} />}
    </div>
  );
};
