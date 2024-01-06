import { Edit } from 'icons';
import type { FC } from 'react';
import { Delay } from '../Delay';

interface Props {
  editMode: boolean;
}

export const PreviewHandlePlaceHolder: FC<Props> = ({ editMode }) => {
  return (
    <div className="text-surface-300 row-span-full flex justify-center py-1">
      <Delay>{editMode ? <Edit /> : null}</Delay>
    </div>
  );
};
