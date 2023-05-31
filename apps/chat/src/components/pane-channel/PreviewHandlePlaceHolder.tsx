import { Edit } from 'icons';
import type { FC } from 'react';
import { Delay } from '../Delay';

interface Props {
  editMode: boolean;
}

export const PreviewHandlePlaceHolder: FC<Props> = ({ editMode }) => {
  return (
    <div className="row-span-full flex py-1 justify-center text-surface-300">
      <Delay>{editMode ? <Edit /> : null}</Delay>
    </div>
  );
};
