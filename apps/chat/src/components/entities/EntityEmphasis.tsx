import type { FC } from 'react';
import type { Emphasis } from '../../interpreter/entities';
import { TextWithCursor } from './TextWithCursor';

interface Props {
  source: string;
  entity: Emphasis;
}

export const EntityEmphasis: FC<Props> = ({ source, entity: { child: { start, len } } }) => {
  return (
    <em>
      <TextWithCursor text={source.substring(start, start + len)} start={start} len={len} />
    </em>
  );
};
