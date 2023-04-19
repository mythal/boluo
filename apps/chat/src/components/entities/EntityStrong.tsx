import type { FC } from 'react';
import type { Strong } from '../../interpreter/entities';
import { TextWithCursor } from './TextWithCursor';

interface Props {
  source: string;
  entity: Strong;
}

export const EntityStrong: FC<Props> = ({ source, entity: { child: { start, len } } }) => {
  return (
    <strong>
      <TextWithCursor text={source.substring(start, start + len)} start={start} len={len} />
    </strong>
  );
};
