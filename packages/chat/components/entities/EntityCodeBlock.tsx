import type { FC } from 'react';
import type { CodeBlock } from '../../interpreter/entities';

interface Props {
  source: string;
  entity: CodeBlock;
}

export const EntityCodeBlock: FC<Props> = ({ source, entity: { start, len } }) => {
  return (
    <div className="py-2">
      <pre className="bg-surface-200 border-surface-300 rounded border px-2 py-1 font-mono shadow-sm">
        {source.substring(start, start + len)}
      </pre>
    </div>
  );
};
