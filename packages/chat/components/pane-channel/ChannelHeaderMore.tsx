import { ChannelMember } from 'api';
import clsx from 'clsx';
import { useMe } from 'common';
import { Edit } from 'icons';
import { FC, useState } from 'react';
import { FormattedMessage } from 'react-intl';
import Icon from 'ui/Icon';
import { useMyChannelMember } from '../../hooks/useMyChannelMember';
import { ChannelHeaderCharacterNameEdit } from './ChannelHeaderCharacterNameEdit';
import { ChannelSettingsButton } from './ChannelSettingsButton';
import { MemberLeaveButton } from './MemberLeaveButton';

interface Props {
  channelId: string;
  resetHeaderState: () => void;
}

export const CharacterName: FC<{ member: ChannelMember; edit?: () => void }> = ({ member, edit }) => {
  return (
    <button
      onClick={edit}
      className={clsx('flex items-center gap-0.5 whitespace-nowrap rounded-sm px-2 py-1', 'hover:bg-pin-brand-700/10')}
    >
      {member.characterName ? (
        <>
          <span className="text-surface-700 @md:inline hidden text-sm">
            <FormattedMessage defaultMessage="Character Name:" />
          </span>
          {member.characterName}
        </>
      ) : (
        <FormattedMessage defaultMessage="No Character Name" />
      )}
      <Icon icon={Edit} className="text-brand-700 ml-1" />
    </button>
  );
};

export const ChannelHeaderMore: FC<Props> = ({ channelId, resetHeaderState }) => {
  const me = useMe();
  const member = useMyChannelMember(channelId);
  const [uiState, setUiState] = useState<'DEFAULT' | 'EDIT_CHARACTER_NAME'>('DEFAULT');
  if (me === 'LOADING' || me == null || member === 'LOADING' || member == null) return null;
  if (uiState === 'EDIT_CHARACTER_NAME') {
    return (
      <div className="flex gap-2 border-b px-4 py-2">
        <ChannelHeaderCharacterNameEdit member={member.channel} exitEdit={() => setUiState('DEFAULT')} />
      </div>
    );
  }
  return (
    <div className="flex items-center gap-2 border-b px-4 py-2">
      <div className="flex-1 overflow-hidden">
        <CharacterName member={member.channel} edit={() => setUiState('EDIT_CHARACTER_NAME')} />
      </div>
      <MemberLeaveButton me={me} channelId={channelId} onSuccess={resetHeaderState} />
      {member.space.isAdmin && (
        <div className="flex-none">
          <ChannelSettingsButton channelId={channelId} />
        </div>
      )}
    </div>
  );
};
