import type { Preview } from 'api';
import { useAtomValue } from 'jotai';
import { selectAtom } from 'jotai/utils';
import { FC, useMemo } from 'react';
import { useChannelId } from '../../hooks/useChannelId';
import { useComposeAtom } from '../../hooks/useComposeAtom';
import { useMyChannelMember } from '../../hooks/useMyChannelMember';
import { ComposeState } from '../../state/compose.reducer';
import { InGameSwitchButton } from '../compose/InGameSwitchButton';
import { Name } from './Name';
import { NameInput } from './NameInput';
import { PreviewBox } from './PreviewBox';
import { SelfPreviewContent } from './SelfPreviewContent';
import { SelfPreviewSendHelpText } from './SelfPreviewSendHelpText';

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
      <div className="flex @2xl:flex-col gap-y-1 gap-x-4 items-center @2xl:items-end justify-between @2xl:justify-start">
        <div className="flex-grow flex-shrink-1 truncate @2xl:flex-shrink-0">
          {!isAction && nameNode}
        </div>
        <div className="flex-shrink flex gap-1 h-8">
          {inGame && <NameInput className="text-sm w-[5rem] @xs:w-[7rem] @2xl:w-full " />}
          <InGameSwitchButton iconOnly />
        </div>
      </div>
      <div className="flex flex-col h-full items-between">
        <SelfPreviewContent isAction={isAction} nameNode={nameNode} />
        <SelfPreviewSendHelpText me={member.user} />
      </div>
    </PreviewBox>
  );
};
