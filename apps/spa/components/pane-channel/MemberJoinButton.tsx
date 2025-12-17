import {
  type ChannelMembers,
  type Channel,
  type ChannelWithMember,
  type SpaceMember,
  type User,
} from '@boluo/api';
import { post } from '@boluo/api-browser';
import { useQueryCurrentUser } from '@boluo/hooks/useQueryCurrentUser';
import { UserPlus } from '@boluo/icons';
import { type FC, type ReactNode, useState } from 'react';
import { FormattedMessage } from 'react-intl';
import useSWRMutation, { type MutationFetcher } from 'swr/mutation';
import { Spinner } from '@boluo/ui/Spinner';
import { useMySpaceMember } from '@boluo/hooks/useQueryMySpaceMember';
import { PaneHeaderButton } from '@boluo/ui/PaneHeaderButton';
import { FailedBanner } from '@boluo/ui/chat/FailedBanner';
import { usePaneAdd } from '../../hooks/usePaneAdd';
import { useQueryChannelMembers } from '@boluo/hooks/useQueryChannelMembers';
import { ButtonInline } from '@boluo/ui/ButtonInline';
import { useBannerNode } from '../../hooks/useBannerNode';
import ReactDOM from 'react-dom';

interface Props {
  channel: Channel;
}

const join: MutationFetcher<
  ChannelWithMember,
  [string, string],
  { characterName?: string }
> = async ([_, channelId], { arg: { characterName = '' } }) => {
  const channelWithMember = await post('/channels/join', null, { channelId, characterName });
  return channelWithMember.unwrap();
};

const check = (
  currentUser: User | undefined | null,
  channel: Channel,
  spaceMember: SpaceMember | null | undefined,
  channelMembers: ChannelMembers | null | undefined,
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
  if (
    channelMembers != null &&
    channelMembers.members.some((member) => member.user.id === currentUser.id)
  ) {
    return 'ALREADY';
  }
  return null;
};

export const MemberJoinButton: FC<Props> = ({ channel }) => {
  const { data: currentUser } = useQueryCurrentUser();
  const { trigger, isMutating } = useSWRMutation(['/channels/members', channel.id], join);
  const { data: spaceMember } = useMySpaceMember(channel.spaceId);
  const { data: channelMembers } = useQueryChannelMembers(channel.id);
  const paneAdd = usePaneAdd();
  const [showError, setShowError] = useState(false);
  const banner = useBannerNode();

  const checkResult = check(currentUser, channel, spaceMember, channelMembers);
  const handleClick = () => {
    if (checkResult != null) {
      setShowError(true);
      return;
    }
    void trigger({});
  };
  let errorNode: ReactNode = null;
  if (showError && checkResult != null) {
    let content: ReactNode;
    switch (checkResult) {
      case 'NOT_LOGGED_IN':
        content = <FormattedMessage defaultMessage="You must be logged in to join a channel." />;
        break;
      case 'NOT_BE_INVITED':
        content = (
          <FormattedMessage defaultMessage="You must be invited to join a private channel." />
        );
        break;
      case 'NOT_A_SPACE_MEMBER':
        content = (
          <>
            <FormattedMessage
              defaultMessage="You must first join the {space} to join a channel."
              values={{
                space: (
                  <ButtonInline
                    onClick={() => {
                      paneAdd({ type: 'SPACE', spaceId: channel.spaceId });
                    }}
                  >
                    <FormattedMessage defaultMessage="Space" />
                  </ButtonInline>
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
    errorNode = banner
      ? ReactDOM.createPortal(
          <FailedBanner onDismiss={() => setShowError(false)}>{content}</FailedBanner>,
          banner,
        )
      : null;
  }

  return (
    <>
      {errorNode}
      <PaneHeaderButton disabled={!currentUser || isMutating} onClick={handleClick}>
        {isMutating ? <Spinner /> : <UserPlus />}
        <FormattedMessage defaultMessage="Join" />
      </PaneHeaderButton>
    </>
  );
};
