import { useAtomValue } from 'jotai';
import { selectAtom } from 'jotai/utils';
import { FC, ReactNode, useDeferredValue, useMemo } from 'react';
import { useComposeAtom } from '../../hooks/useComposeAtom';
import { CursorContext, CursorState } from '../entities/TextWithCursor';
import { Content } from './Content';

interface Props {
  nameNode: ReactNode;
  isAction: boolean;
}

export const SelfPreviewContent: FC<Props> = ({ nameNode, isAction }) => {
  const composeAtom = useComposeAtom();
  const parsed = useAtomValue(
    useMemo(() => selectAtom(composeAtom, ({ parsed }) => parsed), [composeAtom]),
  );
  const cursorState: CursorState = useAtomValue(
    useMemo(() => selectAtom(composeAtom, ({ source, range }) => ({ range: range, self: true })), [composeAtom]),
  );
  const deferredParsed = useDeferredValue(parsed);
  return (
    <CursorContext.Provider value={cursorState}>
      <Content parsed={deferredParsed} nameNode={nameNode} isAction={isAction} self isPreview />
    </CursorContext.Provider>
  );
};