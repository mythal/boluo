import { FC } from 'react';
import { useMyChannelMember } from '../../hooks/useMyChannelMember';
import { ChannelHeaderCharacterNameEdit } from './ChannelHeaderCharacterNameEdit';
import { FormattedMessage } from 'react-intl';

export const ChannelHeaderEditCharacter: FC<{ channelId: string; exitEdit: () => void }> = ({
  channelId,
  exitEdit,
}) => {
  const member = useMyChannelMember(channelId);

  return (
    <div className="bg-pane-header px-pane flex gap-2 border-b py-2">
      {member.isErr ? (
        member.err === 'LOADING' ? (
          <FormattedMessage defaultMessage="Loading..." />
        ) : (
          <FormattedMessage defaultMessage="Failded to load channel member information." />
        )
      ) : (
        <ChannelHeaderCharacterNameEdit member={member.some.channel} exitEdit={exitEdit} />
      )}
    </div>
  );
};
