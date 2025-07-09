import { EntityOf } from '@boluo/api';
import type { FC } from 'react';

interface Props {
  source: string;
  entity: EntityOf<'StrongEmphasis'>;
}

export const EntityStrongEmphasis: FC<Props> = ({
  source,
  entity: {
    child: { start, len },
  },
}) => {
  return <strong className="EntityStrongEmphasis">{source.substring(start, start + len)}</strong>;
};
