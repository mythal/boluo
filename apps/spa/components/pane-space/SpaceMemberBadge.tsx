import { type SpaceMemberWithUser } from '@boluo/api';
import Users from '@boluo/icons/Users';
import { type FC } from 'react';
import { FormattedMessage } from 'react-intl';
import { Badge } from '@boluo/ui/Badge';
import Icon from '@boluo/ui/Icon';
import { usePaneToggle } from '../../hooks/usePaneToggle';

interface Props {
  spaceId: string;
  members: SpaceMemberWithUser[] | null;
}

export const SpaceMemberBadge: FC<Props> = ({ members, spaceId }) => {
  const count = members == null ? '...' : members.length;
  const toggleChild = usePaneToggle({ child: '2/3' });
  const handleClick = () => {
    toggleChild({ type: 'SPACE_MEMBERS', spaceId });
  };
  return (
    <Badge icon={<Icon icon={Users} />} onClick={handleClick}>
      <FormattedMessage defaultMessage="{count} members" values={{ count }} />
    </Badge>
  );
};
