import type { FC } from 'react';
import type { EntityOf } from '@boluo/api';

interface Props {
  source: string;
  entity: EntityOf<'CodeBlock'>;
}

export const EntityCodeBlock: FC<Props> = ({
  source,
  entity: {
    child: { start, len },
  },
}) => {
  return (
    <div className="py-2">
      <pre className="EntityCodeBlock bg-surface-muted border-border-default text-text-primary font-pixel overflow-x-auto rounded border px-2 py-1 shadow-sm">
        {source.substring(start, start + len)}
      </pre>
    </div>
  );
};
