import { type EntityOf } from '@boluo/api';
import type { FC } from 'react';

interface Props {
  source: string;
  entity: EntityOf<'Text'>;
}

export const EntityText: FC<Props> = ({ source, entity: { start, len } }) => {
  return <span className="EntityText">{source.substring(start, start + len)}</span>;
};
