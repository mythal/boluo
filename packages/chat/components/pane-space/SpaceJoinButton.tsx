import { ApiError, SpaceWithMember } from '@boluo/api';
import { post } from '@boluo/api-browser';
import { UserPlus } from '@boluo/icons';
import { FC } from 'react';
import { FormattedMessage } from 'react-intl';
import useSWRMutation from 'swr/mutation';
import { unwrap } from '@boluo/utils';
import { SidebarHeaderButton } from '../sidebar/SidebarHeaderButton';
import { useSWRConfig } from 'swr';

interface Props {
  spaceId: string;
}

export const SpaceJoinButton: FC<Props> = ({ spaceId }) => {
  const { mutate } = useSWRConfig();
  const key = ['/spaces/my_space_member', spaceId] as const;
  const { trigger: join, isMutating: isJoining } = useSWRMutation<SpaceWithMember, ApiError, typeof key>(
    key,
    ([_, spaceId]) => post('/spaces/join', { spaceId }, {}).then(unwrap),
    {
      onSuccess: () => {
        void mutate(['/spaces/members', spaceId]);
      },
    },
  );
  return (
    <SidebarHeaderButton icon={<UserPlus />} onClick={() => join()}>
      <span className="">
        <FormattedMessage defaultMessage="Join Space" />
      </span>
    </SidebarHeaderButton>
  );
};
