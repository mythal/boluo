import { Member } from 'api';
import { useAtomValue } from 'jotai';
import { selectAtom } from 'jotai/utils';
import { FC, useMemo } from 'react';
import { useChannelAtoms } from '../../hooks/useChannelAtoms';
import { useMediaDrop } from '../../hooks/useMediaDrop';
import { PreviewItem } from '../../state/channel.types';
import { ComposeState } from '../../state/compose.reducer';
import { Delay } from '../Delay';
import { MessageMedia } from './MessageMedia';
import { Name } from './Name';
import { PreviewBox } from './PreviewBox';
import { RemoveMediaButton } from './RemoveMediaButton';
import { SelfPreviewContent } from './SelfPreviewContent';
import { SelfPreviewNameCell } from './SelfPreviewNameCell';
import { SelfPreviewOperations } from './SelfPreviewOperations';
import { SelfPreviewSendHelpText } from './SelfPreviewSendHelpText';

type ComposeDrived = Pick<ComposeState, 'source' | 'inGame' | 'media'> & {
  editMode: boolean;
  name: string;
};

const isEqual = (a: ComposeDrived, b: ComposeDrived) =>
  a.source === b.source && a.editMode === b.editMode
  && a.inGame === b.inGame && a.name === b.name
  && a.media === b.media;

const selector = ({ inGame, inputedName, source, editFor, media }: ComposeState): ComposeDrived => {
  const editMode = editFor !== null;
  return { inGame, name: inputedName.trim(), source, editMode, media };
};

interface Props {
  className?: string;
  preview: PreviewItem;
  myMember: Member;
}

export const SelfPreview: FC<Props> = ({ preview, className, myMember: member }) => {
  const isMaster = member.channel.isMaster;
  const { composeAtom, isActionAtom } = useChannelAtoms();
  const compose: ComposeDrived = useAtomValue(
    useMemo(() => selectAtom(composeAtom, selector, isEqual), [composeAtom]),
  );
  const isAction = useAtomValue(isActionAtom);
  const { editMode, inGame, media } = compose;
  const name = useMemo(() => {
    if (!inGame) {
      return member.user.nickname;
    } else if (compose.name !== '') {
      return compose.name;
    }
    return member.channel.characterName;
  }, [compose.name, inGame, member.channel.characterName, member.user.nickname]);
  const nameNode = useMemo(() => {
    return <Name name={name} isMaster={isMaster} isPreview self />;
  }, [isMaster, name]);
  const { onDrop } = useMediaDrop();

  return (
    <PreviewBox
      id={preview.key}
      editMode={editMode}
      onDrop={onDrop}
      className="bg-brand-50 border-t border-b border-brand-200"
    >
      <SelfPreviewNameCell
        isAction={isAction}
        inGame={inGame}
        name={name}
        channelMember={member.channel}
      />
      <div className="flex flex-col gap-1 h-full items-between">
        <SelfPreviewContent myMember={member.channel} nameNode={nameNode} />
        <MessageMedia mediaFile={media} className="relative w-fit py-2">
          <div className="absolute right-full -translate-x-1 top-2">
            <RemoveMediaButton />
          </div>
        </MessageMedia>
        <Delay timeout={16} fallback={<div className="h-12"></div>}>
          <SelfPreviewOperations className="flex gap-1 items-center h-12 transition-opacity duration-700 opacity-0 data-[enter='true']:opacity-100" />
        </Delay>
        <div className="min-h-[1.5em]">
          <SelfPreviewSendHelpText me={member.user} />
        </div>
      </div>
    </PreviewBox>
  );
};
