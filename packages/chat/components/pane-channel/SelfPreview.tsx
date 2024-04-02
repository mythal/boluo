import { Member } from '@boluo/api';
import { useAtomValue } from 'jotai';
import { selectAtom } from 'jotai/utils';
import { FC, useMemo } from 'react';
import { useChannelAtoms } from '../../hooks/useChannelAtoms';
import { useMediaDrop } from '../../hooks/useMediaDrop';
import { PreviewItem } from '../../state/channel.types';
import { ComposeState } from '../../state/compose.reducer';
import { MessageMedia } from './MessageMedia';
import { Name } from './Name';
import { PreviewBox } from './PreviewBox';
import { RemoveMediaButton } from './RemoveMediaButton';
import { SelfPreviewContent } from './SelfPreviewContent';
import { SelfPreviewNameCell } from './SelfPreviewNameCell';
import { SelfPreviewToolbar } from './SelfPreviewToolbar';

type ComposeDrived = Pick<ComposeState, 'source' | 'defaultInGame' | 'media'> & {
  editMode: boolean;
  name: string;
};

const isEqual = (a: ComposeDrived, b: ComposeDrived) =>
  a.source === b.source &&
  a.editMode === b.editMode &&
  a.defaultInGame === b.defaultInGame &&
  a.name === b.name &&
  a.media === b.media;

const selector = ({ defaultInGame: inGame, inputedName, source, editFor, media }: ComposeState): ComposeDrived => {
  const editMode = editFor !== null;
  return { defaultInGame: inGame, name: inputedName.trim(), source, editMode, media };
};

interface Props {
  className?: string;
  preview: PreviewItem;
  myMember: Member;
}

export const SelfPreview: FC<Props> = ({ preview, className, myMember: member }) => {
  const isMaster = member.channel.isMaster;
  const { composeAtom, isActionAtom, inGameAtom } = useChannelAtoms();
  const compose: ComposeDrived = useAtomValue(useMemo(() => selectAtom(composeAtom, selector, isEqual), [composeAtom]));
  const isAction = useAtomValue(isActionAtom);
  const inGame = useAtomValue(inGameAtom);
  const { editMode, media } = compose;
  const name = useMemo(() => {
    if (!inGame) {
      return member.user.nickname;
    } else if (compose.name !== '') {
      return compose.name;
    }
    return member.channel.characterName;
  }, [compose.name, inGame, member.channel.characterName, member.user.nickname]);
  const nameNode = useMemo(() => {
    return <Name inGame={inGame} name={name} isMaster={isMaster} isPreview self />;
  }, [inGame, isMaster, name]);
  const { onDrop } = useMediaDrop();
  const mediaNode = useMemo(() => {
    if (media == null) return null;
    return (
      <MessageMedia media={media} className="relative w-fit py-2">
        <div className="absolute right-full top-2 -translate-x-1">
          <RemoveMediaButton />
        </div>
      </MessageMedia>
    );
  }, [media]);

  return (
    <PreviewBox
      id={preview.key}
      editMode={editMode}
      isSelf
      onDrop={onDrop}
      className="bg-preview-self/20 border-preview-self border-b border-t"
    >
      <SelfPreviewNameCell isAction={isAction} inGame={inGame} name={name} channelMember={member.channel} />
      <div className="items-between pr-messageRight flex h-full flex-col gap-1">
        <SelfPreviewContent myMember={member.channel} nameNode={nameNode} />
        {mediaNode}
        <SelfPreviewToolbar currentUser={member.user} />
      </div>
    </PreviewBox>
  );
};
