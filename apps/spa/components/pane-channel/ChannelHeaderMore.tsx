import { type MemberWithUser, type ChannelMember } from '@boluo/api';
import clsx from 'clsx';
import { Edit } from '@boluo/icons';
import { useMemo, type FC } from 'react';
import { FormattedMessage } from 'react-intl';
import Icon from '@boluo/ui/Icon';
import { ChannelSettingsButton } from './ChannelSettingsButton';
import { MemberLeaveButton } from './MemberLeaveButton';
import { type ChannelHeaderState } from './ChannelHeader';
import { ChannelHeaderFilter } from './ChannelHeaderFilter';
import { ChannelHeaderFilterShowArchive } from './ChannelHeaderFilterShowArchive';
import { MemberJoinButton } from './MemberJoinButton';
import { useQueryChannel } from '../../hooks/useQueryChannel';
import { useQueryCurrentUser } from '@boluo/common';
import { ChannelExportButton } from './ChannelExportButton';
import { useQueryChannelMembers } from '../../hooks/useQueryChannelMembers';

interface Props {
  channelId: string;
  setHeaderState: (state: ChannelHeaderState) => void;
}

export const CharacterName: FC<{ member: ChannelMember; edit?: () => void }> = ({
  member,
  edit,
}) => {
  return (
    <button
      onClick={edit}
      className={clsx(
        'flex items-center gap-0.5 whitespace-nowrap rounded-sm px-2 py-1',
        'hover:bg-pin-brand-700/10',
      )}
    >
      {member.characterName ? (
        <>
          <span className="text-surface-700 @md:inline hidden text-sm">
            <FormattedMessage defaultMessage="Character Name:" />
          </span>
          <span>{member.characterName}</span>
        </>
      ) : (
        <span>
          <FormattedMessage defaultMessage="No Character Name" />
        </span>
      )}
      <Icon icon={Edit} className="text-brand-700 ml-1" />
    </button>
  );
};

export const ChannelHeaderMore: FC<Props> = ({ channelId, setHeaderState }) => {
  const { data: channel } = useQueryChannel(channelId);
  const { data: currentUser } = useQueryCurrentUser();
  const { data: members } = useQueryChannelMembers(channelId);
  const member = useMemo((): MemberWithUser | null => {
    if (members == null || members.members.length === 0 || members.selfIndex == null) {
      return null;
    } else {
      return members.members[members.selfIndex] ?? null;
    }
  }, [members]);

  let memberButton = null;
  if (currentUser == null) {
    // Keep the button hidden
  } else if (member) {
    memberButton = (
      <MemberLeaveButton channelId={channelId} onSuccess={() => setHeaderState('DEFAULT')} />
    );
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
