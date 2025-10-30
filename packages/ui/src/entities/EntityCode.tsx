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
    <code className="EntityCode bg-surface-muted border-border-strong rounded-sm border px-1 shadow-sm">
      {source.substring(start, start + len)}
    </code>
  );
};
