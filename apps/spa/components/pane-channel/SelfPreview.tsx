import { Member } from '@boluo/api';
import { useAtomValue } from 'jotai';
import { selectAtom } from 'jotai/utils';
import { FC, useMemo } from 'react';
import { useChannelAtoms } from '../../hooks/useChannelAtoms';
import { useMediaDrop } from '../../hooks/useMediaDrop';
import { PreviewItem } from '../../state/channel.types';
import { ComposeState } from '../../state/compose.reducer';
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

const selector = ({ inputedName, source, editFor, media }: ComposeState): ComposeDrived => {
  const editMode = editFor !== null;
  return { name: inputedName.trim(), editMode, media };
};

interface Props {
  preview: PreviewItem;
  myMember: Member;
  theme: 'light' | 'dark';
  isLast: boolean;
}

export const SelfPreview: FC<Props> = ({ preview, myMember: member, theme, isLast }) => {
  const isFocused = usePaneIsFocus();
  const isMaster = member.channel.isMaster;
  const { composeAtom, isActionAtom, inGameAtom } = useChannelAtoms();
  const compose: ComposeDrived = useAtomValue(useMemo(() => selectAtom(composeAtom, selector, isEqual), [composeAtom]));
  const isAction = useAtomValue(isActionAtom);
  const inGame = useAtomValue(inGameAtom);
  const { editMode, media } = compose;
  const color = useMessageColor(theme, member.user, inGame, null);
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
      <NameEditable inGame={inGame} name={name} member={member} isMaster={isMaster} color={color} isPreview self />
    );
  }, [color, inGame, isMaster, member, name]);
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
    <PreviewBox isLast={isLast} id={preview.key} inGame={inGame} editMode={editMode} isSelf onDrop={onDrop}>
      <SelfPreviewNameCell isAction={isAction} nameNode={nameNode} />
      <div>
        <div className="items-between @2xl:pr-messageRight flex h-full min-h-8 flex-col gap-1">
          <SelfPreviewContent isFocused={isFocused} myMember={member.channel} nameNode={nameNode} />
          {mediaNode}
        </div>

        <div className="h-6">{isFocused && <SelfPreviewToolbar currentUser={member.user} />}</div>
      </div>
    </PreviewBox>
  );
};
