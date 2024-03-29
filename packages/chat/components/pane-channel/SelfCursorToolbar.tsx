import { FC, useContext, useEffect, useMemo } from 'react';
import { autoUpdate, useFloating } from '@floating-ui/react';
import { SelfCursorToolbarButtons } from './SelfCursorToolbarButtons';
import { CursorContext } from '../entities/TextWithCursor';
import { Atom, useAtomValue } from 'jotai';

interface Props {
  cursorAtom: Atom<HTMLElement | null>;
}

export const SelfCursorToolbar: FC<Props> = ({ cursorAtom }) => {
  // `useContext` will trigger a re-render when the cursor state changes.
  const cursorState = useContext(CursorContext);
  const cursorNode = useAtomValue(cursorAtom);

  const { update, floatingStyles, refs } = useFloating({
    elements: {
      reference: cursorNode,
    },
    middleware: [],
    whileElementsMounted: autoUpdate,
  });
  useEffect(() => {
    const hendle = window.setTimeout(() => {
      update();
    }, 8);
    return () => window.clearTimeout(hendle);
  });

  const collapsed = useMemo(() => {
    const [a, b] = cursorState?.range ?? [0, 0];
    return a === b;
  }, [cursorState?.range]);
  const buttions = useMemo(() => <SelfCursorToolbarButtons collapsed={collapsed} />, [collapsed]);

  return (
    <div
      ref={refs.setFloating}
      style={floatingStyles}
      className="bg-lowest border-highest flex select-none items-center justify-center rounded-lg border-[2px] shadow"
    >
      {buttions}
    </div>
  );
};

SelfCursorToolbar.displayName = 'SelfCursorToolbar';
