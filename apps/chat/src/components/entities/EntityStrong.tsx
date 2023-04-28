import type { FC, ReactNode } from 'react';
import type { Strong } from '../../interpreter/entities';
import { TextWithCursor } from './TextWithCursor';

interface Props {
  source: string;
  entity: Strong;
  cursorNode: ReactNode;
}

export const EntityStrong: FC<Props> = ({ source, entity: { child: { start, len } }, cursorNode }) => {
  return (
    <strong>
      <TextWithCursor text={source.substring(start, start + len)} start={start} len={len} cursorNode={cursorNode} />
    </strong>
  );
};
