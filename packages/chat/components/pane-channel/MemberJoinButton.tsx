import { Channel, ChannelWithMember, SpaceMember, User } from '@boluo/api';
import { post } from '@boluo/api-browser';
import { useQueryUser } from '@boluo/common';
import { UserPlus } from '@boluo/icons';
import { FC, ReactNode, useState } from 'react';
import { FormattedMessage } from 'react-intl';
import useSWRMutation, { MutationFetcher } from 'swr/mutation';
import { Button } from '@boluo/ui/Button';
import { Spinner } from '@boluo/ui/Spinner';
import { MyChannelMemberResult, useMyChannelMember } from '../../hooks/useMyChannelMember';
import { useMySpaceMember } from '../../hooks/useQueryMySpaceMember';
import { SidebarHeaderButton } from '../sidebar/SidebarHeaderButton';
import { FailedBanner } from '../common/FailedBanner';
import { usePaneAdd } from '../../hooks/usePaneAdd';

interface Props {
  channel: Channel;
}

const join: MutationFetcher<ChannelWithMember, [string, string], { characterName?: string }> = async (
  [_, channelId],
  { arg: { characterName = '' } },
) => {
  const channelWithMember = await post('/channels/join', null, { channelId, characterName });
  return channelWithMember.unwrap();
};

const check = (
  currentUser: User | undefined | null,
  channel: Channel,
  spaceMember: SpaceMember | null | undefined,
  channelMember: MyChannelMemberResult,
): 'NOT_BE_INVITED' | 'NOT_LOGGED_IN' | 'NOT_A_SPACE_MEMBER' | 'ALREADY' | null => {
  if (currentUser == null) {
    return 'NOT_LOGGED_IN';
  }
  if (!channel.isPublic) {
    return 'NOT_BE_INVITED';
  }
  if (spaceMember == null) {
    return 'NOT_A_SPACE_MEMBER';
  }
  if (channelMember.isOk) {
    return 'ALREADY';
  }
  return null;
};

export const MemberJoinButton: FC<Props> = ({ channel }) => {
  const { data: currentUser } = useQueryUser();
  const { trigger, isMutating } = useSWRMutation(['/channels/members', channel.id], join);
  const { data: spaceMember } = useMySpaceMember(channel.spaceId);
  const channelMember = useMyChannelMember(channel.id);
  const paneAdd = usePaneAdd();
  const [showError, setShowError] = useState(false);

  const checkResult = check(currentUser, channel, spaceMember, channelMember);
  const handleClick = async () => {
    if (checkResult != null) {
      setShowError(true);
      return;
    }
    await trigger({});
  };
  let errorNode: ReactNode = null;
  if (showError && checkResult != null) {
    let content: ReactNode;
    switch (checkResult) {
      case 'NOT_LOGGED_IN':
        content = <FormattedMessage defaultMessage="You must be logged in to join a channel." />;
        break;
      case 'NOT_BE_INVITED':
        content = <FormattedMessage defaultMessage="You must be invited to join a private channel." />;
        break;
      case 'NOT_A_SPACE_MEMBER':
        content = (
          <>
            <FormattedMessage
              defaultMessage="You must first join the {space} to join a channel."
              values={{
                space: (
                  <Button
                    data-small
                    onClick={() => {
                      paneAdd({ type: 'SPACE', spaceId: channel.spaceId });
                    }}
                  >
                    <FormattedMessage defaultMessage="Space" />
                  </Button>
                ),
              }}
            />
          </>
        );
        break;
      case 'ALREADY':
        content = <FormattedMessage defaultMessage="You are already a member of this channel." />;
        break;
    }
    errorNode = <FailedBanner onDissmiss={() => setShowError(false)}>{content}</FailedBanner>;
  }

  return (
    <>
      {errorNode}
      <SidebarHeaderButton disabled={!currentUser || isMutating} onClick={handleClick}>
        {isMutating ? <Spinner /> : <UserPlus />}
        <FormattedMessage defaultMessage="Join" />
      </SidebarHeaderButton>
    </>
  );
};
