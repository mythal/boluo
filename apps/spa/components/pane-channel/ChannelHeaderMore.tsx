import { ChannelMember } from '@boluo/api';
import clsx from 'clsx';
import { Edit } from '@boluo/icons';
import { FC } from 'react';
import { FormattedMessage } from 'react-intl';
import Icon from '@boluo/ui/Icon';
import { useMyChannelMember } from '../../hooks/useMyChannelMember';
import { ChannelSettingsButton } from './ChannelSettingsButton';
import { MemberLeaveButton } from './MemberLeaveButton';
import { ChannelHeaderState } from './ChannelHeader';
import { ChannelHeaderFilter } from './ChannelHeaderFilter';
import { ChannelHeaderFilterShowArchive } from './ChannelHeaderFilterShowArchive';
import { MemberJoinButton } from './MemberJoinButton';
import { useQueryChannel } from '../../hooks/useQueryChannel';
import { useQueryCurrentUser } from '@boluo/common';
import { ChannelExportButton } from './ChannelExportButton';

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
  const { isLoading, data: channel } = useQueryChannel(channelId);
  const { data: currentUser } = useQueryCurrentUser();
  const memberResult = useMyChannelMember(channelId);
  const member = memberResult.isOk ? memberResult.some : null;

  let memberButton = null;
  if (currentUser == null) {
    // Keep the button hidden
  } else if (member) {
    memberButton = <MemberLeaveButton channelId={channelId} onSuccess={() => setHeaderState('DEFAULT')} />;
  } else if (channel != null) {
    memberButton = <MemberJoinButton channel={channel} />;
  }

  return (
    <div className="bg-pane-header-bg pl-pane flex items-baseline gap-x-2 gap-y-1 py-2 pr-2 text-xs">
      <ChannelHeaderFilter />
      <ChannelHeaderFilterShowArchive />
      <div className="flex-grow" />
      {memberButton}
      {member?.space.isAdmin && (
        <div className="flex-none">
          <ChannelSettingsButton channelId={channelId} />
        </div>
      )}
      {member?.channel.channelId === channelId && (
        <div className="flex-none">
          <ChannelExportButton channelId={channelId} />
        </div>
      )}
    </div>
  );
};
