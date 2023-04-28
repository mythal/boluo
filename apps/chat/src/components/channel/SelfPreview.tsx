import type { Preview } from 'api';
import { useAtomValue } from 'jotai';
import { selectAtom } from 'jotai/utils';
import { FC, useMemo } from 'react';
import { useChannelId } from '../../hooks/useChannelId';
import { useComposeAtom } from '../../hooks/useComposeAtom';
import { useMyChannelMember } from '../../hooks/useMyChannelMember';
import { ComposeState } from '../../state/compose.reducer';
import { CancelEditingButton } from './CancelEditingButton';
import { Name } from './Name';
import { PreviewBox } from './PreviewBox';
import { SelfPreviewContent } from './SelfPreviewContent';
import { SelfPreviewNameCell } from './SelfPreviewNameCell';
import { SelfPreviewSendHelpText } from './SelfPreviewSendHelpText';
import { ToggleActionButton } from './ToggleActionButton';

type ComposeDrived = Pick<ComposeState, 'source' | 'inGame' | 'isAction'> & {
  editMode: boolean;
  name: string;
};

const isEqual = (a: ComposeDrived, b: ComposeDrived) =>
  a.source === b.source && a.editMode === b.editMode
  && a.inGame === b.inGame && a.name === b.name
  && a.isAction === b.isAction;

const selector = ({ inGame, isAction, inputedName, source, editFor }: ComposeState): ComposeDrived => {
  const editMode = editFor !== null;
  return { inGame, isAction, name: inputedName.trim(), source, editMode };
};

interface Props {
  className?: string;
  preview: Preview;
}

export const SelfPreview: FC<Props> = ({ preview, className }) => {
  const channelId = useChannelId();
  const member = useMyChannelMember(channelId);
  if (member === null) {
    throw new Error('Member not found');
  }
  const isMaster = member.channel.isMaster;
  const composeAtom = useComposeAtom();
  const compose: ComposeDrived = useAtomValue(
    useMemo(() => selectAtom(composeAtom, selector, isEqual), [composeAtom]),
  );
  const { editMode, inGame, isAction } = compose;
  const name = inGame ? compose.name : member.user.nickname;
  const nameNode = useMemo(() => {
    return <Name name={name} isMaster={isMaster} isPreview self />;
  }, [isMaster, name]);

  return (
    <PreviewBox id={preview.id} editMode={editMode} className="bg-brand-50 border-t border-b border-brand-200">
      <SelfPreviewNameCell isAction={isAction} inGame={inGame} nameNode={nameNode} />
      <div className="flex flex-col gap-1 h-full items-between">
        <SelfPreviewContent nameNode={nameNode} />
        <div className="flex gap-1">
          <ToggleActionButton />
          <CancelEditingButton />
        </div>
        <div className="min-h-[1.5em]">
          <SelfPreviewSendHelpText me={member.user} />
        </div>
      </div>
    </PreviewBox>
  );
};
