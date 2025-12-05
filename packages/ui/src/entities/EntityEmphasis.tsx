import type { EntityOf } from '@boluo/api';
import clsx from 'clsx';
import type { FC } from 'react';

interface Props {
  source: string;
  entity: EntityOf<'Emphasis'>;
  isAction?: boolean;
}

export const EntityEmphasis: FC<Props> = ({
  source,
  entity: {
    child: { start, len },
  },
  isAction = false,
}) => {
  return (
    <em
      className={clsx('EntityEmphasis', isAction ? 'decoration-text-subtle underline' : 'italic')}
    >
      {source.substring(start, start + len)}
    </em>
  );
};
