import type { FC } from 'react';
import type { Text } from '../../interpreter/entities';

interface Props {
  source: string;
  entity: Text;
}

export const EntityText: FC<Props> = ({ source, entity: { start, len } }) => {
  return <span className="EntityText">{source.substring(start, start + len)}</span>;
};
