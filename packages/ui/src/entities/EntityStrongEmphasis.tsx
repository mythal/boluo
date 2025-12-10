import { type EntityOf } from '@boluo/api';
import clsx from 'clsx';
import type { FC } from 'react';

interface Props {
  source: string;
  entity: EntityOf<'StrongEmphasis'>;
  isAction?: boolean;
}

export const EntityStrongEmphasis: FC<Props> = ({
  source,
  entity: {
    child: { start, len },
  },
  isAction = false,
}) => {
  return (
    <strong
      className={clsx(
        'EntityStrongEmphasis',
        isAction ? 'decoration-text-subtle underline' : 'font-bold italic',
      )}
    >
      {source.substring(start, start + len)}
    </strong>
  );
};
