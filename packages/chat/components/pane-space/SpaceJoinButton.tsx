import { ApiError, Space, SpaceMemberWithUser, SpaceWithMember } from 'api';
import { post } from 'api-browser';
import { UserPlus, UserX } from 'icons';
import { FC } from 'react';
import React from 'react';
import { FormattedMessage } from 'react-intl';
import useSWRMutation, { MutationFetcher } from 'swr/mutation';
import { unwrap } from 'utils';
import { SidebarHeaderButton } from '../sidebar/SidebarHeaderButton';

interface Props {
  spaceId: string;
}

export const SpaceJoinButton: FC<Props> = ({ spaceId }) => {
  const key = ['/spaces/members', spaceId] as const;
  const { trigger: join, isMutating: isJoining } = useSWRMutation<SpaceWithMember, ApiError, typeof key>(
    key,
    ([_, spaceId]) => post('/spaces/join', { spaceId }, {}).then(unwrap),
  );
  return (
    <SidebarHeaderButton icon={<UserPlus />} onClick={() => join()}>
      <span className="">
        <FormattedMessage defaultMessage="Join Space" />
      </span>
    </SidebarHeaderButton>
  );
};
