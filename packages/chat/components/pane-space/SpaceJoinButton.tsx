import { ApiError, Space, SpaceMemberWithUser, SpaceWithMember } from '@boluo/api';
import { post } from '@boluo/api-browser';
import { UserPlus, UserX } from '@boluo/icons';
import { FC } from 'react';
import React from 'react';
import { FormattedMessage } from 'react-intl';
import useSWRMutation, { MutationFetcher } from 'swr/mutation';
import { unwrap } from '@boluo/utils';
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
