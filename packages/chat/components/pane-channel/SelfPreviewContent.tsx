import { ChannelMember } from '@boluo/api';
import { atom, useAtomValue, useStore } from 'jotai';
import { selectAtom } from 'jotai/utils';
import { FC, ReactNode, useDeferredValue, useEffect, useMemo, useRef } from 'react';
import { useChannelAtoms } from '../../hooks/useChannelAtoms';
import { useScrollerRef } from '../../hooks/useScrollerRef';
import { CursorContext, CursorState } from '../entities/TextWithCursor';
import { Content } from './Content';
import { ContentWhisperTo } from './SelfPreviewContentWhisperTo';

interface Props {
  nameNode: ReactNode;
  myMember: ChannelMember;
  isFocused: boolean;
}

export const SelfPreviewContent: FC<Props> = ({ nameNode, myMember, isFocused }) => {
  const store = useStore();
  const { composeAtom, parsedAtom, inGameAtom } = useChannelAtoms();
  const inGame = useAtomValue(inGameAtom);
  const parsed = useAtomValue(parsedAtom);
  const cursorState: CursorState = useAtomValue(
    useMemo(() => selectAtom(composeAtom, ({ source, range }) => ({ range: range, self: true })), [composeAtom]),
  );

  const cursorAtom = useMemo(() => atom<HTMLElement | null>(null), []);
  const scrollerRef = useScrollerRef();
  const prevRangeRef = useRef<[number, number] | null>(null);

  useEffect(() => {
    const prevRange = prevRangeRef.current;
    prevRangeRef.current = cursorState.range;
    if (prevRange === null) return;
    const [a0, b0] = prevRange;
    const [a1, b1] = cursorState.range;
    if (a0 === a1 && b0 === b1) return;
    const cursorWrapper = store.get(cursorAtom)?.parentElement;
    if (cursorWrapper == null) return;
    const scroller = scrollerRef.current;
    if (scroller == null) return;
    const scrollerRect = scroller.getBoundingClientRect();
    const cursorRect = cursorWrapper.getBoundingClientRect();
    if (cursorRect.bottom > scrollerRect.bottom) {
      cursorWrapper.scrollIntoView({ block: 'end' });
    } else if (cursorRect.top < scrollerRect.top) {
      cursorWrapper.scrollIntoView({ block: 'start' });
    }
  });

  const deferredParsed = useDeferredValue(parsed);
  return (
    <CursorContext.Provider value={cursorState}>
      {parsed.whisperToUsernames != null && (
        <ContentWhisperTo
          inGame={inGame}
          channelId={myMember.channelId}
          whisperToUsernames={parsed.whisperToUsernames}
        />
      )}
      <Content
        channelId={myMember.channelId}
        source={deferredParsed.text}
        entities={deferredParsed.entities}
        isAction={deferredParsed.isAction}
        isArchived={false}
        nameNode={nameNode}
        self
        isPreview
        cursorAtom={cursorAtom}
        isFocused={isFocused}
      />
    </CursorContext.Provider>
  );
};
