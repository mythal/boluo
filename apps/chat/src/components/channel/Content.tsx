import type { FC, ReactNode } from 'react';
import { OthersCursor } from './OthersCursor';
import { SelfCursor } from './SelfCursor';

interface Props {
  text: string;
  self?: boolean;
  isAction: boolean;
  nameNode: ReactNode;
}

export const Content: FC<Props> = ({ text, isAction, nameNode, self = false }) => {
  return (
    <div className="h-full pb-16 break-all whitespace-pre-wrap relative">
      {isAction && nameNode}
      {text || ' '}
      {self ? <SelfCursor /> : <OthersCursor />}
    </div>
  );
};
