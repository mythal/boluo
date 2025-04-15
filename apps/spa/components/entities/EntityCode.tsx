import type { FC } from 'react';
import type { EntityOf } from '@boluo/api';

interface Props {
  source: string;
  entity: EntityOf<'Code'>;
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
