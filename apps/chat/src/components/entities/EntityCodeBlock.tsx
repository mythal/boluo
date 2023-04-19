import type { FC } from 'react';
import type { CodeBlock } from '../../interpreter/entities';

interface Props {
  source: string;
  entity: CodeBlock;
}

export const EntityCodeBlock: FC<Props> = ({ source, entity: { start, len } }) => {
  return (
    <div className="py-2">
      <pre className="bg-surface-200 border border-surface-300 py-1 px-2 rounded font-mono shadow-sm">
        {source.substring(start, start+len)}
      </pre>
    </div>
  );
};
