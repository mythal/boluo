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
      <pre className="EntityCodeBlock border-border-default no-autospace font-pixel overflow-x-auto rounded border bg-black px-2 py-1 text-[15px] leading-snug text-green-300 not-italic shadow-sm">
        {source.substring(start, start + len)}
      </pre>
    </div>
  );
};
