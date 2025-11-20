import { Edit } from '@boluo/icons';
import type { FC } from 'react';
import { Delay } from './Delay';

interface Props {
  editMode: boolean;
}

export const PreviewHandlePlaceHolder: FC<Props> = ({ editMode }) => {
  return (
    <div className="PreviewHandlePlaceHolder text-text-subtle row-span-full flex justify-center py-1">
      <Delay fallback={null}>{editMode ? <Edit /> : null}</Delay>
    </div>
  );
};
