import { post } from 'api-browser';
import { UserX } from 'icons';
import { FC } from 'react';
import { FormattedMessage } from 'react-intl';
import useSWRMutation from 'swr/mutation';
import Icon from 'ui/Icon';
import { InListButton } from './InListButton';

interface Props {
  spaceId: string;
  userId: string;
}

export const ExileButton: FC<Props> = ({ spaceId, userId }) => {
  const key = ['/spaces/members', spaceId] as const;
  const { trigger: exile, isMutating } = useSWRMutation(key, async ([_, spaceId]) => {
    const result = await post('/spaces/kick', { spaceId, userId }, {});
    return result.unwrap();
  }, {
    populateCache: (updatedMembers) => updatedMembers,
    revalidate: false,
  });
  return (
    <InListButton onClick={() => exile()}>
      <Icon icon={UserX} />
      <FormattedMessage defaultMessage="Exile" />
    </InListButton>
  );
};
