import type { FC, ReactNode } from 'react';
import type { Text } from '../../interpreter/entities';
import { TextWithCursor } from './TextWithCursor';

interface Props {
  source: string;
  entity: Text;
  cursorNode: ReactNode;
}

export const EntityText: FC<Props> = ({ source, entity: { start, len }, cursorNode }) => {
  return <TextWithCursor cursorNode={cursorNode} text={source.substring(start, start + len)} start={start} len={len} />;
};
