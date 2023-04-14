import type { FC, ReactNode } from 'react';

interface Props {
  text: string;
  isAction: boolean;
  nameNode: ReactNode;
}

const Cursor = () => {
  return (
    <span className="inline-block w-2 h-6 absolute bg-highest cursor-blink">
    </span>
  );
};

export const Content: FC<Props> = ({ text, isAction, nameNode }) => {
  return (
    <div className="h-full break-all whitespace-pre-wrap relative">
      {isAction && nameNode}
      {text || ' '}
      <Cursor />
    </div>
  );
};
