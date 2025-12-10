import { useQueryCurrentUser } from '@boluo/common/hooks/useQueryCurrentUser';
import { FormattedMessage } from 'react-intl';
import { ComposeFallbackBox } from '@boluo/ui/ComposeFallbackBox';
import { type ReactNode, type FC } from 'react';
import { useQuerySpaceMembers } from '../../hooks/useQuerySpaceMembers';
import { ButtonInline } from '@boluo/ui/ButtonInline';
import { useMutateJoinChannel } from '../../hooks/useMutateJoinChannel';
import { AlertTriangle, UserPlus } from '@boluo/icons';
import Icon from '@boluo/ui/Icon';
import { Spinner } from '@boluo/ui/Spinner';

interface Props {
  channelId: string;
  spaceId: string;
}

export const GuestCompose: FC<Props> = ({ channelId, spaceId }) => {
  const { data: currentUser } = useQueryCurrentUser();
  const {
    data: spaceMembers,
    isLoading: isQueryingMember,
    error: queryMembersError,
  } = useQuerySpaceMembers(spaceId);
  const {
    isMutating: isJoining,
    error: joinError,
    trigger: join,
  } = useMutateJoinChannel(channelId);
  if (!currentUser) {
    return (
      <ComposeFallbackBox
        description={<FormattedMessage defaultMessage="You are not logged in" />}
      />
    );
  }
  let icon: ReactNode = <Icon icon={UserPlus} />;
  if (isQueryingMember || isJoining) {
    icon = <Spinner />;
  } else if (queryMembersError || joinError) {
    icon = <Icon icon={AlertTriangle} />;
  } else if (spaceMembers && !(currentUser.id in spaceMembers)) {
    return (
      <ComposeFallbackBox
        description={<FormattedMessage defaultMessage="You are not a member of this space" />}
      />
    );
  }
  return (
    <ComposeFallbackBox
      description={
        <>
          <span className="mr-1">
            <FormattedMessage defaultMessage="You are not a member of this channel" />
          </span>
          <ButtonInline onClick={() => void join({})}>
            {icon} <FormattedMessage defaultMessage="Join" />
          </ButtonInline>
        </>
      }
    />
  );
};
