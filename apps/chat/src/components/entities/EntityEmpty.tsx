import type { FC, ReactNode } from 'react';

interface Props {
  cursorNode: ReactNode;
}

export const EntityEmpty: FC<Props> = ({ cursorNode }) => {
  return <>{cursorNode}{' '}</>;
};
