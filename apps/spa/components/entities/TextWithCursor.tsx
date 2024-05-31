import { createContext, type FC, type ReactNode, useContext } from 'react';
import { type ComposeRange } from '../../state/compose.reducer';

export interface CursorState {
  self: boolean;
  range: ComposeRange;
}

export const CursorContext = createContext<CursorState | null>(null);

interface Props {
  text: string;
  start: number;
  cursorNode: ReactNode;
  /** The top-level tail cursor will handle by `Content` */
  withoutTailCursor?: boolean;
  len: number;
}

export const TextWithCursor: FC<Props> = ({
  text,
  start: entityStart,
  len: entityLen,
  cursorNode,
  withoutTailCursor = false,
}) => {
  const cursorState = useContext(CursorContext);

  if (!cursorState || !cursorState.range) {
    return <>{text}</>;
  }
  const [cursorStart, cursorEnd] = cursorState.range;
  const entityEnd = entityStart + entityLen;

  if (cursorEnd < entityStart || cursorStart > entityEnd) {
    // [||||||] ...text...
    // ...text... [||||]
    return <>{text}</>;
  } else if (cursorStart === cursorEnd) {
    // ...teIxt...
    const leftText = text.substring(0, cursorStart - entityStart);
    const rightText = text.substring(cursorStart - entityStart);
    if (withoutTailCursor && rightText.length === 0) {
      return <>{leftText}</>;
    }
    return (
      <>
        {leftText}
        {cursorNode}
        {rightText}
      </>
    );
  }
  const start = Math.max(entityStart, cursorStart) - entityStart;
  const end = Math.min(entityEnd, cursorEnd) - entityStart;
  const a = text.substring(0, start);
  const b = text.substring(start, end);
  const c = text.substring(end);
  const cursorBetweenBC = cursorEnd <= entityEnd && cursorEnd > entityStart;

  return (
    <>
      {a}
      <span className="bg-blue-600/25">{b}</span>
      {cursorBetweenBC && cursorNode}
      {c}
    </>
  );
};
