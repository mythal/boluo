import clsx from 'clsx';
import { FC, ReactNode, useMemo } from 'react';
import { Delay } from '../Delay';
import { OthersCursor } from './OthersCursor';
import { SelfCursor } from './SelfCursor';

interface Props {
  text: string;
  self?: boolean;
  isAction: boolean;
  nameNode: ReactNode;
}

export const Content: FC<Props> = ({ text, isAction, nameNode, self = false }) => {
  const cursor = useMemo(() => (
    <Delay timeout={100}>
      {self ? <SelfCursor /> : <OthersCursor />}
    </Delay>
  ), [self]);
  return (
    <div className={clsx('h-full break-all whitespace-pre-wrap relative', self ? 'pb-12' : '')}>
      {isAction && nameNode}
      {text || ' '}
      {cursor}
    </div>
  );
};
