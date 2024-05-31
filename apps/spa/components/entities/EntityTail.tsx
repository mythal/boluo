import { useContext, type FC, type ReactNode } from 'react';
import { CursorContext } from './TextWithCursor';

interface Props {
  source: string;
  cursorNode: ReactNode;
}

export const EntityTail: FC<Props> = ({ cursorNode, source }) => {
  const cursorState = useContext(CursorContext);
  if (cursorState == null) {
    return null;
  }
  const [_a, b] = cursorState.range;
  if (b < source.length) {
    return null;
  }
  return <>{cursorNode}</>;
};
