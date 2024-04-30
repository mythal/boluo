import type { FC, ReactNode } from 'react';
import type { Emphasis } from '../../interpreter/entities';
import { TextWithCursor } from './TextWithCursor';

interface Props {
  source: string;
  entity: Emphasis;
  cursorNode: ReactNode;
}

export const EntityEmphasis: FC<Props> = ({
  source,
  entity: {
    child: { start, len },
  },
  cursorNode,
}) => {
  return (
    <em>
      <TextWithCursor text={source.substring(start, start + len)} start={start} len={len} cursorNode={cursorNode} />
    </em>
  );
};
