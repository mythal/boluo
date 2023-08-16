import { ChannelMember } from 'api';
import { FC, memo, ReactNode } from 'react';
import { FormattedMessage } from 'react-intl';
import { useEditChannelCharacterName } from '../../hooks/useEditChannelCharacterName';
import { InGameSwitchButton } from '../compose/InGameSwitchButton';
import { IsActionIndicator } from './IsActionIndicator';
import { Name } from './Name';
import { NameInput } from './NameInput';

interface Props {
  inGame: boolean;
  isAction: boolean;
  name: string;
  channelMember: ChannelMember;
}

const SaveAsCharacterName: FC<{ channelId: string; characterName: string }> = ({ channelId, characterName }) => {
  const {
    trigger,
    isMutating,
  } = useEditChannelCharacterName(channelId);
  return (
    <div className="absolute left-0 bottom-full w-max bg-highest/60 text-brand-300 hover:text-brand-200 rounded shadow px-2 py-1 -translate-x-2">
      {isMutating
        ? (
          <span className="text-sm animate-pulse">
            Saving...
          </span>
        )
        : (
          <button
            className="text-sm underline flex-none"
            onClick={() => trigger({ characterName })}
          >
            <FormattedMessage defaultMessage="As default character name" />
          </button>
        )}
    </div>
  );
};

export const SelfPreviewNameCell = memo<Props>(({ inGame, name, isAction, channelMember }) => {
  const { isMaster, characterName } = channelMember;
  return (
    <div className="flex @2xl:flex-col pb-2 gap-y-1 gap-x-4 items-center @2xl:items-end justify-between @2xl:justify-start">
      <div className="flex-grow flex-shrink-1 @2xl:flex-shrink-0 max-w-full relative">
        {!isAction ? <Name name={name} isMaster={isMaster} isPreview self /> : <IsActionIndicator />}

        {inGame && name !== '' && characterName !== name && (
          <SaveAsCharacterName channelId={channelMember.channelId} characterName={name} />
        )}
      </div>

      <div className="flex-shrink flex gap-1 h-8">
        {inGame && <NameInput className="text-sm w-[5rem] @xs:w-[7rem] @2xl:w-full " />}
        <InGameSwitchButton type="ICON" />
      </div>
    </div>
  );
});
SelfPreviewNameCell.displayName = 'SelfPreviewNameCell';
