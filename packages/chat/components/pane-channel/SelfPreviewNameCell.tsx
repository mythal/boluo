import { ChannelMember } from 'api';
import clsx from 'clsx';
import { Save } from 'icons';
import { FC, memo } from 'react';
import { FormattedMessage } from 'react-intl';
import Icon from 'ui/Icon';
import { useEditChannelCharacterName } from '../../hooks/useEditChannelCharacterName';
import { Delay } from '../Delay';
import { IsActionIndicator } from './IsActionIndicator';
import { Name } from './Name';
import { NameToolbox } from './NameToolbox';

interface Props {
  inGame: boolean;
  isAction: boolean;
  name: string;
  channelMember: ChannelMember;
}

const SaveAsCharacterName: FC<{ channelId: string; characterName: string }> = ({ channelId, characterName }) => {
  const { trigger, isMutating } = useEditChannelCharacterName(channelId);
  return (
    <button
      className={clsx(
        'bg-pin-brand-600 text-pin-lowest shadow-1/2 shadow-surface-400/50 absolute bottom-full left-0 w-max -translate-x-2 rounded-sm px-2 py-1',
        'opacity-40 hover:opacity-100 group-hover:opacity-100',
      )}
      onClick={() => trigger({ characterName })}
    >
      {isMutating ? (
        <span className="text-pin-lowest animate-pulse text-sm">
          <FormattedMessage defaultMessage="Saving…" />
        </span>
      ) : (
        <span className="flex-none text-sm">
          <Icon icon={Save} className="mr-1" />
          <FormattedMessage defaultMessage="Keep name" />
        </span>
      )}
    </button>
  );
};

export const SelfPreviewNameCell = memo<Props>(({ inGame, name, isAction, channelMember }) => {
  const { isMaster, characterName } = channelMember;
  return (
    <div className="@2xl:flex-col @2xl:items-end @2xl:justify-start flex items-center justify-between gap-x-4 gap-y-1 pb-2">
      <div className="flex-shrink-1 @2xl:flex-shrink-0 relative max-w-full flex-grow">
        {!isAction ? <Name name={name} isMaster={isMaster} isPreview self /> : <IsActionIndicator />}
        <NameToolbox channelMember={channelMember} />
      </div>
    </div>
  );
});
SelfPreviewNameCell.displayName = 'SelfPreviewNameCell';
