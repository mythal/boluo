import type { FC, ReactNode } from 'react';

interface Props {
  text: string;
  isAction: boolean;
  nameNode: ReactNode;
}

export const Content: FC<Props> = ({ text, isAction, nameNode }) => {
  return (
    <div className="h-full break-all whitespace-pre-wrap">
      {isAction && nameNode}
      {text}
    </div>
  );
};
