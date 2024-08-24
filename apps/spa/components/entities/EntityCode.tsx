import type { FC } from 'react';
import type { Code } from '../../interpreter/entities';

interface Props {
  source: string;
  entity: Code;
}

export const EntityCode: FC<Props> = ({
  source,
  entity: {
    child: { start, len },
  },
}) => {
  return (
    <code className="EntityCode bg-surface-200 border-surface-300 rounded-sm border px-1 shadow-sm">
      {source.substring(start, start + len)}
    </code>
  );
};
