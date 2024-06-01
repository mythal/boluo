import type { FC } from 'react';
import type { Strong } from '../../interpreter/entities';

interface Props {
  source: string;
  entity: Strong;
}

export const EntityStrong: FC<Props> = ({
  source,
  entity: {
    child: { start, len },
  },
}) => {
  return <strong>{source.substring(start, start + len)}</strong>;
};
