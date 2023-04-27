import { Edit } from 'icons';
import type { FC } from 'react';

interface Props {
  editMode: boolean;
}

export const PreviewHandlePlaceHolder: FC<Props> = ({ editMode }) => {
  return <div className="row-span-full flex py-1 justify-center text-surface-300">{editMode ? <Edit /> : null}</div>;
};
