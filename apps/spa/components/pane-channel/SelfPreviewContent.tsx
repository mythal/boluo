import { type ChannelMember } from '@boluo/api';
import { atom, useAtomValue } from 'jotai';
import { selectAtom } from 'jotai/utils';
import { type FC, type ReactNode, useDeferredValue, useMemo } from 'react';
import { useChannelAtoms } from '../../hooks/useChannelAtoms';
import { CursorContext, type CursorState } from '../entities/TextWithCursor';
import { Content } from './Content';
import { ContentWhisperTo } from './SelfPreviewContentWhisperTo';

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
    useMemo(() => selectAtom(composeAtom, ({ range }) => ({ range: range, self: true })), [composeAtom]),
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
          myId={myMember.userId}
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
