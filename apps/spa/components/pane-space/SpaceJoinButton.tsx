import { type ApiError, type SpaceWithMember } from '@boluo/api';
import { post } from '@boluo/api-browser';
import { AlertTriangle, UserPlus } from '@boluo/icons';
import { type ReactNode, type FC } from 'react';
import { FormattedMessage } from 'react-intl';
import useSWRMutation from 'swr/mutation';
import { unwrap } from '@boluo/utils';
import { SidebarHeaderButton } from '../sidebar/SidebarHeaderButton';
import { useSWRConfig } from 'swr';
import { Spinner } from '@boluo/ui/Spinner';

interface Props {
  spaceId: string;
}

export const SpaceJoinButton: FC<Props> = ({ spaceId }) => {
  const { mutate } = useSWRConfig();
  const key = ['/spaces/my_space_member', spaceId] as const;
  const {
    trigger: join,
    isMutating: isJoining,
    error,
  } = useSWRMutation<SpaceWithMember, ApiError, typeof key>(
    key,
    ([_, spaceId]) => post('/spaces/join', { spaceId }, {}).then(unwrap),
    {
      onSuccess: () => {
        void mutate(['/spaces/members', spaceId]);
      },
    },
  );
  let icon: ReactNode = <UserPlus />;
  if (isJoining) {
    icon = <Spinner />;
  } else if (error) {
    icon = <AlertTriangle />;
  }
  return (
    <SidebarHeaderButton
      className="SpaceJoinButton"
      isLoading={isJoining}
      icon={icon}
      onClick={() => join()}
    >
      <span className="text-xs">
        <FormattedMessage defaultMessage="Join Space" />
      </span>
    </SidebarHeaderButton>
  );
};
