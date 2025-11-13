import { type MemberWithUser } from '@boluo/api';
import { useAtomValue } from 'jotai';
import { selectAtom } from 'jotai/utils';
import { type FC, useMemo } from 'react';
import { useChannelAtoms } from '../../hooks/useChannelAtoms';
import { useMediaDrop } from '../../hooks/useMediaDrop';
import { type PreviewItem } from '../../state/channel.types';
import { type ComposeState } from '../../state/compose.reducer';
import { MessageMedia } from './MessageMedia';
import { PreviewBox } from './PreviewBox';
import { RemoveMediaButton } from './RemoveMediaButton';
import { SelfPreviewContent } from './SelfPreviewContent';
import { SelfPreviewNameCell } from './SelfPreviewNameCell';
import { SelfPreviewToolbar } from './SelfPreviewToolbar';
import { useMessageColor } from '../../hooks/useMessageColor';
import { usePaneIsFocus } from '../../hooks/usePaneIsFocus';
import { NameEditable } from './NameEditable';

type ComposeDrived = Pick<ComposeState, 'media'> & {
  editMode: boolean;
  name: string;
};

const isEqual = (a: ComposeDrived, b: ComposeDrived) =>
  a.editMode === b.editMode && a.name === b.name && a.media === b.media;

const selector = ({ inputedName, edit, media }: ComposeState): ComposeDrived => {
  const editMode = edit != null;
  return { name: inputedName.trim(), editMode, media };
};

interface Props {
  preview: PreviewItem;
  myMember: MemberWithUser;
  isLast: boolean;
}

export const SelfPreview: FC<Props> = ({ preview, myMember: member, isLast }) => {
  const isFocused = usePaneIsFocus();
  const isMaster = member.channel.isMaster;
  const { composeAtom, isActionAtom, inGameAtom } = useChannelAtoms();
  const compose: ComposeDrived = useAtomValue(
    useMemo(() => selectAtom(composeAtom, selector, isEqual), [composeAtom]),
  );
  const isAction = useAtomValue(isActionAtom);
  const inGame = useAtomValue(inGameAtom);
  const { editMode, media } = compose;
  const color = useMessageColor(member.user, inGame, null);
  const name = useMemo(() => {
    if (!inGame) {
      return member.user.nickname;
    } else if (compose.name !== '') {
      return compose.name;
    }
    return member.channel.characterName;
  }, [compose.name, inGame, member.channel.characterName, member.user.nickname]);
  const nameNode = useMemo(() => {
    return (
      <NameEditable
        inGame={inGame}
        name={name}
        member={member}
        isMaster={isMaster}
        color={color}
        isPreview
        self
      />
    );
  }, [color, inGame, isMaster, member, name]);
  const { onDrop } = useMediaDrop();
  const mediaNode = useMemo(() => {
    if (media == null) return null;
    return (
      <MessageMedia media={media} className="relative w-fit py-2">
        <div className="absolute top-2 right-full -translate-x-1">
          <RemoveMediaButton />
        </div>
      </MessageMedia>
    );
  }, [media]);

  return (
    <PreviewBox
      isLast={isLast}
      id={preview.id}
      inGame={inGame}
      editMode={editMode}
      isSelf
      onDrop={onDrop}
      pos={preview.pos}
    >
      <SelfPreviewNameCell isAction={isAction} nameNode={nameNode} />
      <div>
        <SelfPreviewContent myMember={member.channel} nameNode={nameNode} mediaNode={mediaNode} />

        <div className="h-6">{isFocused && <SelfPreviewToolbar currentUser={member.user} />}</div>
      </div>
    </PreviewBox>
  );
};
