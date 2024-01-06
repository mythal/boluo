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
    <code className="bg-surface-200 px-1 rounded-sm border border-surface-300 shadow-sm">
      {source.substring(start, start + len)}
    </code>
  );
};
