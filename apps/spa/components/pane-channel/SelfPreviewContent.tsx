import { type ChannelMember } from '@boluo/api';
import { useAtomValue, useSetAtom } from 'jotai';
import { type FC, type ReactNode, useDeferredValue, useEffect } from 'react';
import { useChannelAtoms } from '../../hooks/useChannelAtoms';
import { Content } from './Content';
import { ContentWhisperTo } from './SelfPreviewContentWhisperTo';
import { SelfPreviewPlaceholder } from './SelfPreviewPlaceholder';

interface Props {
  nameNode: ReactNode;
  myMember: ChannelMember;
  mediaNode: ReactNode;
  hidePlaceholder: boolean;
}

export const SelfPreviewContent: FC<Props> = ({
  nameNode,
  myMember,
  mediaNode,
  hidePlaceholder,
}) => {
  const { parsedAtom, inGameAtom, composeAtom, lastWhisperTargetsAtom } = useChannelAtoms();
  const inGame = useAtomValue(inGameAtom);
  const parsed = useAtomValue(parsedAtom);
  const setLastWhisperTargets = useSetAtom(lastWhisperTargetsAtom);

  useEffect(() => {
    if (parsed.whisperToUsernames != null) {
      setLastWhisperTargets(parsed.whisperToUsernames);
    }
  }, [parsed.whisperToUsernames, setLastWhisperTargets]);

  const deferredParsed = useDeferredValue(parsed);
  return (
    <div className="items-between pr-message-small irc:pr-message flex h-full min-h-8 flex-col gap-1">
      {parsed.whisperToUsernames != null && (
        <ContentWhisperTo
          inGame={inGame}
          channelId={myMember.channelId}
          whisperToUsernames={parsed.whisperToUsernames}
          myId={myMember.userId}
        />
      )}
      <div>
        {parsed.entities.length > 0 ? (
          <Content
            source={deferredParsed.text}
            entities={deferredParsed.entities}
            isAction={deferredParsed.isAction}
            isArchived={false}
            nameNode={nameNode}
          />
        ) : (
          <SelfPreviewPlaceholder
            channelId={myMember.channelId}
            inGame={inGame}
            composeAtom={composeAtom}
            faded={hidePlaceholder}
          />
        )}
      </div>
      {mediaNode}
    </div>
  );
};
