import Edit from '@boluo/icons/Edit';
import { memo, type ReactNode } from 'react';
import { Delay } from './Delay';

interface Props {
  editMode: boolean;
  children?: ReactNode;
}

export const PreviewHandlePlaceHolder = memo(({ editMode, children }: Props) => {
  let icon = children;
  if (children == null && editMode) {
    icon = <Edit />;
  }
  return (
    <div className="PreviewHandlePlaceHolder text-text-subtle row-span-full flex justify-center py-1">
      <Delay fallback={null}>{icon}</Delay>
    </div>
  );
});
PreviewHandlePlaceHolder.displayName = 'PreviewHandlePlaceHolder';
