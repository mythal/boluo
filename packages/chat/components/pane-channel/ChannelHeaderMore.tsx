import { ChannelMember } from '@boluo/api';
import clsx from 'clsx';
import { useMe } from '@boluo/common';
import { Edit } from '@boluo/icons';
import { FC } from 'react';
import { FormattedMessage } from 'react-intl';
import Icon from '@boluo/ui/Icon';
import { useMyChannelMember } from '../../hooks/useMyChannelMember';
import { ChannelSettingsButton } from './ChannelSettingsButton';
import { MemberLeaveButton } from './MemberLeaveButton';
import { ChannelHeaderState } from './ChannelHeader';

interface Props {
  channelId: string;
  setHeaderState: (state: ChannelHeaderState) => void;
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

export const ChannelHeaderMore: FC<Props> = ({ channelId, setHeaderState }) => {
  const memberResult = useMyChannelMember(channelId);
  if (memberResult.isErr) {
    console.warn('Failed to load channel member information:', memberResult.err);
    return null;
  }
  const member = memberResult.some;

  return (
    <div className="bg-pane-header px-pane flex items-center gap-2 border-b py-2">
      <div className="flex-1 overflow-hidden">
        <CharacterName member={member.channel} edit={() => setHeaderState('CHARACTER')} />
      </div>
      <MemberLeaveButton channelId={channelId} onSuccess={() => setHeaderState('DEFAULT')} />
      {member.space.isAdmin && (
        <div className="flex-none">
          <ChannelSettingsButton channelId={channelId} />
        </div>
      )}
    </div>
  );
};
