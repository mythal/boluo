import type { FC } from 'react';
import type { Text } from '../../interpreter/entities';
import { TextWithCursor } from './TextWithCursor';

interface Props {
  source: string;
  entity: Text;
}

export const EntityText: FC<Props> = ({ source, entity: { start, len } }) => {
  return <TextWithCursor text={source.substring(start, start + len)} start={start} len={len} />;
};
