import { ChannelMember } from '@boluo/api';
import { atom, useAtomValue, useStore } from 'jotai';
import { selectAtom } from 'jotai/utils';
import { FC, ReactNode, useDeferredValue, useEffect, useMemo, useRef } from 'react';
import { useChannelAtoms } from '../../hooks/useChannelAtoms';
import { useScrollerRef } from '../../hooks/useScrollerRef';
import { CursorContext, CursorState } from '../entities/TextWithCursor';
import { Content } from './Content';
import { ContentWhisperTo } from './SelfPreviewContentWhisperTo';
import { useIsTouch } from '../../hooks/useIsTouch';

interface Props {
  nameNode: ReactNode;
  myMember: ChannelMember;
  isFocused: boolean;
}

export const SelfPreviewContent: FC<Props> = ({ nameNode, myMember, isFocused }) => {
  const { composeAtom, parsedAtom, inGameAtom } = useChannelAtoms();
  const inGame = useAtomValue(inGameAtom);
  const parsed = useAtomValue(parsedAtom);
  const cursorState: CursorState = useAtomValue(
    useMemo(() => selectAtom(composeAtom, ({ source, range }) => ({ range: range, self: true })), [composeAtom]),
  );

  const cursorAtom = useMemo(() => atom<HTMLElement | null>(null), []);

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
