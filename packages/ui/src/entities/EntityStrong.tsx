import { type EntityOf } from '@boluo/api';
import type { FC } from 'react';

interface Props {
  source: string;
  entity: EntityOf<'Strong'>;
}

export const EntityStrong: FC<Props> = ({
  source,
  entity: {
    child: { start, len },
  },
}) => {
  return <strong className="EntityStrong">{source.substring(start, start + len)}</strong>;
};
