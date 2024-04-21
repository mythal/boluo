import { useContext, type FC, type ReactNode } from 'react';
import { CursorContext } from './TextWithCursor';

interface Props {
  cursorNode: ReactNode;
  firstEntityStart: number;
}

export const EntityHead: FC<Props> = ({ cursorNode, firstEntityStart }) => {
  const cursorState = useContext(CursorContext);
  if (cursorState == null) {
    return null;
  }
  const [a, b] = cursorState.range;
  if (b >= firstEntityStart) {
    return null;
  }
  return <>{cursorNode}</>;
};
