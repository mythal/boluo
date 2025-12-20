import { type ChannelMember } from '@boluo/api';
import clsx from 'clsx';
import { Edit } from '@boluo/icons';
import { type FC } from 'react';
import { FormattedMessage } from 'react-intl';
import Icon from '@boluo/ui/Icon';
import { ChannelSettingsButton } from './ChannelSettingsButton';
import { MemberLeaveButton } from './MemberLeaveButton';
import { type ChannelHeaderState } from './ChannelHeader';
import { ChannelHeaderFilter } from './ChannelHeaderFilter';
import { ChannelHeaderFilterShowArchive } from './ChannelHeaderFilterShowArchive';
import { MemberJoinButton } from './MemberJoinButton';
import { useQueryChannel } from '@boluo/hooks/useQueryChannel';
import { useQueryCurrentUser } from '@boluo/hooks/useQueryCurrentUser';
import { ChannelExportButton } from './ChannelExportButton';
import { useMember } from '../../hooks/useMember';

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
        'CharacterName',
        'flex items-center gap-0.5 rounded-sm px-2 py-1 whitespace-nowrap',
        'hover:bg-brand-strong/10',
      )}
    >
      {member.characterName ? (
        <>
          <span className="text-text-secondary hidden text-sm @md:inline">
            <FormattedMessage defaultMessage="Character Name:" />
          </span>
          <span>{member.characterName}</span>
        </>
      ) : (
        <span>
          <FormattedMessage defaultMessage="No Character Name" />
        </span>
      )}
      <Icon icon={Edit} className="text-brand-strong ml-1" />
    </button>
  );
};

export const ChannelHeaderMore: FC<Props> = ({ channelId, setHeaderState }) => {
  const { data: channel } = useQueryChannel(channelId);
  const { data: currentUser } = useQueryCurrentUser();
  const member = useMember();

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
    <div className="bg-pane-header-bg pl-pane flex items-baseline gap-x-1 gap-y-1 py-2 pr-2">
      <ChannelHeaderFilter />
      <ChannelHeaderFilterShowArchive />
      <div className="grow" />
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
