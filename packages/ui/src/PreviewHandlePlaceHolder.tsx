import Edit from '@boluo/icons/Edit';
import { memo } from 'react';
import { Delay } from './Delay';

interface Props {
  editMode: boolean;
}

export const PreviewHandlePlaceHolder = memo(({ editMode }: Props) => {
  return (
    <div className="PreviewHandlePlaceHolder text-text-subtle row-span-full flex justify-center py-1">
      <Delay fallback={null}>{editMode ? <Edit /> : null}</Delay>
    </div>
  );
});
PreviewHandlePlaceHolder.displayName = 'PreviewHandlePlaceHolder';
