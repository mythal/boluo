import { useQueryCurrentUser } from '@boluo/common';
import { FormattedMessage } from 'react-intl';
import { ComposeFallbackBox } from '@boluo/ui/ComposeFallbackBox';
import { type FC } from 'react';
import { useQuerySpaceMembers } from '../../hooks/useQuerySpaceMembers';
import { LoadingText } from '@boluo/ui/LoadingText';
import { useMutateJoinChannel } from '../../hooks/useMutateJoinChannel';

interface Props {
  channelId: string;
  spaceId: string;
}

export const GuestCompose: FC<Props> = ({ channelId, spaceId }) => {
  const { data: currentUser } = useQueryCurrentUser();
  const { data: spaceMembers, isLoading: isQueryingMember, error: queryMembersError } = useQuerySpaceMembers(spaceId);
  const { isMutating: isJoining, error: joinError, trigger: join } = useMutateJoinChannel(channelId);
  if (!currentUser) {
    return <ComposeFallbackBox description={<FormattedMessage defaultMessage="You are not logged in" />} />;
  } else if (isQueryingMember || isJoining) {
    return <ComposeFallbackBox description={<LoadingText />} />;
  } else if (queryMembersError) {
    return <ComposeFallbackBox description={<FormattedMessage defaultMessage="Failed to load" />} />;
  } else if (joinError) {
    return <ComposeFallbackBox description={<FormattedMessage defaultMessage="Failed to join" />} />;
  } else if (spaceMembers && !(currentUser.id in spaceMembers)) {
    return (
      <ComposeFallbackBox description={<FormattedMessage defaultMessage="You are not a member of this space" />} />
    );
  }
  return (
    <ComposeFallbackBox
      description={
        <>
          <span className="mr-1">
            <FormattedMessage defaultMessage="You are not a member of this channel" />
          </span>
          <button className="font-bold underline" onClick={() => join({})}>
            <FormattedMessage defaultMessage="Join" />
          </button>
        </>
      }
    />
  );
};
