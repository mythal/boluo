import { type ChannelMember } from '@boluo/api';
import { useAtomValue } from 'jotai';
import { type FC, type ReactNode, useDeferredValue } from 'react';
import { useChannelAtoms } from '../../hooks/useChannelAtoms';
import { Content } from './Content';
import { ContentWhisperTo } from './SelfPreviewContentWhisperTo';

interface Props {
  nameNode: ReactNode;
  myMember: ChannelMember;
}

export const SelfPreviewContent: FC<Props> = ({ nameNode, myMember }) => {
  const { parsedAtom, inGameAtom } = useChannelAtoms();
  const inGame = useAtomValue(inGameAtom);
  const parsed = useAtomValue(parsedAtom);

  const deferredParsed = useDeferredValue(parsed);
  return (
    <>
      {parsed.whisperToUsernames != null && (
        <ContentWhisperTo
          inGame={inGame}
          channelId={myMember.channelId}
          whisperToUsernames={parsed.whisperToUsernames}
          myId={myMember.userId}
        />
      )}
      <div>
        <Content
          source={deferredParsed.text}
          entities={deferredParsed.entities}
          isAction={deferredParsed.isAction}
          isArchived={false}
          nameNode={nameNode}
        />
      </div>
    </>
  );
};
