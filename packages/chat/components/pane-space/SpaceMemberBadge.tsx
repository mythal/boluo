import { SpaceMemberWithUser } from 'api';
import { Users } from 'icons';
import { FC } from 'react';
import { FormattedMessage } from 'react-intl';
import Icon from 'ui/Icon';
import { usePaneAdd } from '../../hooks/usePaneAdd';
import { Badge } from './Badge';

interface Props {
  spaceId: string;
  members: SpaceMemberWithUser[] | null;
}

export const SpaceMemberBadge: FC<Props> = ({ members, spaceId }) => {
  const count = members == null ? '...' : members.length;
  const addPane = usePaneAdd();
  const handleClick = () => {
    addPane({ type: 'SPACE_MEMBERS', spaceId });
  };
  return (
    <Badge icon={<Icon icon={Users} />} onClick={handleClick}>
      <FormattedMessage
        defaultMessage="{count} members"
        values={{ count }}
      />
    </Badge>
  );
};
