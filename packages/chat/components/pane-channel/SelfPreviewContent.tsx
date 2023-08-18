import { useAtomValue } from 'jotai';
import { selectAtom } from 'jotai/utils';
import { FC, ReactNode, useDeferredValue, useEffect, useMemo, useRef } from 'react';
import { useChannelAtoms } from '../../hooks/useChannelAtoms';
import { useComposeAtom } from '../../hooks/useComposeAtom';
import { useScrollerRef } from '../../hooks/useScrollerRef';
import { Cursor } from '../entities/Cursor';
import { CursorContext, CursorState } from '../entities/TextWithCursor';
import { Content } from './Content';

interface Props {
  nameNode: ReactNode;
}

export const SelfPreviewContent: FC<Props> = ({ nameNode }) => {
  const { composeAtom, parsedAtom } = useChannelAtoms();

  const parsed = useAtomValue(parsedAtom);
  const cursorState: CursorState = useAtomValue(
    useMemo(() => selectAtom(composeAtom, ({ source, range }) => ({ range: range, self: true })), [composeAtom]),
  );

  const scrollerRef = useScrollerRef();
  const cursorRef = useRef<HTMLSpanElement | null>(null);
  const cursorNode = useMemo(() => <Cursor self ref={cursorRef} />, []);
  const prevRangeRef = useRef<[number, number] | null>(null);

  useEffect(() => {
    const prevRange = prevRangeRef.current;
    prevRangeRef.current = cursorState.range;
    if (prevRange === null) return;
    const [a0, b0] = prevRange;
    const [a1, b1] = cursorState.range;
    if (a0 === a1 && b0 === b1) return;
    const cursor = cursorRef.current;
    if (cursor === null) return;
    const scroller = scrollerRef.current;
    if (scroller === null) return;
    const scrollerRect = scroller.getBoundingClientRect();
    const cursorRect = cursor.getBoundingClientRect();
    if (cursorRect.bottom > scrollerRect.bottom || cursorRect.top < scrollerRect.top) {
      cursor.scrollIntoView();
    }
  });

  const deferredParsed = useDeferredValue(parsed);
  return (
    <CursorContext.Provider value={cursorState}>
      <Content cursorNode={cursorNode} parsed={deferredParsed} nameNode={nameNode} self isPreview />
    </CursorContext.Provider>
  );
};
