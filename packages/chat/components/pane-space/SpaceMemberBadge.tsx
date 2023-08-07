import { SpaceMemberWithUser } from 'api';
import { Users } from 'icons';
import { FC } from 'react';
import { FormattedMessage } from 'react-intl';
import { Badge } from 'ui/Badge';
import Icon from 'ui/Icon';
import { usePaneAdd } from '../../hooks/usePaneAdd';

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
