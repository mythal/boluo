import { FC } from 'react';

interface Props {
  self?: boolean;
}

export const Cursor: FC<Props> = ({ self = false }) => {
  return <span className="preview-cursor inline-block w-[2px] h-6 absolute bg-surface-900" />;
};
