import Edit from '@boluo/icons/Edit';
import type { FC } from 'react';
import { Delay } from '@boluo/ui/Delay';

interface Props {
  editMode: boolean;
}

export const PreviewHandlePlaceHolder: FC<Props> = ({ editMode }) => {
  return (
    <div className="text-text-subtle row-span-full flex justify-center py-1">
      <Delay fallback={null}>{editMode ? <Edit /> : null}</Delay>
    </div>
  );
};
