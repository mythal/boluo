import type { FC } from 'react';
import type { Emphasis } from '../../interpreter/entities';

interface Props {
  source: string;
  entity: Emphasis;
}

export const EntityEmphasis: FC<Props> = ({
  source,
  entity: {
    child: { start, len },
  },
}) => {
  return <em className="EntityEmphasis">{source.substring(start, start + len)}</em>;
};
