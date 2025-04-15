import type { EntityOf } from '@boluo/api';
import type { FC } from 'react';

interface Props {
  source: string;
  entity: EntityOf<'Emphasis'>;
}

export const EntityEmphasis: FC<Props> = ({
  source,
  entity: {
    child: { start, len },
  },
}) => {
  return <em className="EntityEmphasis">{source.substring(start, start + len)}</em>;
};
