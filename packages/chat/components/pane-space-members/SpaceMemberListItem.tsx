import { SpaceMemberWithUser } from 'api';
import { FC, useCallback, useState } from 'react';
import { FormattedMessage } from 'react-intl';
import { Badge } from 'ui/Badge';
import { usePaneAdd } from '../../hooks/usePaneAdd';
import { Avatar } from '../account/Avatar';
import { ExileButton } from './ExileButton';
import { InListButton } from './InListButton';

interface Props {
  myId: string | null;
  amIAdmin: boolean;
  spaceOwnerId: string | null | undefined;
  member: SpaceMemberWithUser;
}

export const SpaceMemberListItem: FC<Props> = ({
  member: { user, space: spaceMembership },
  spaceOwnerId,
  amIAdmin,
  myId,
}) => {
  const isAdmin = spaceMembership.isAdmin || spaceOwnerId === user.id;
  const [isShowOperation, setShowOperation] = useState(false);
  const profileUrl = `/profile/${user.id}`;
  const addPane = usePaneAdd();
  const openProfile: React.MouseEventHandler<HTMLAnchorElement> = useCallback(
    (e) => {
      e.preventDefault();
      addPane({ type: 'PROFILE', userId: user.id });
    },
    [addPane, user.id],
  );
  const thisIsMe = myId === user.id;

  return (
    <div className="group px-4 py-2 grid grid-cols-[auto_1fr_auto] grid-flow-col gap-y-1 gap-x-2 grid-rows-[auto_auto] items-center">
      <a href={profileUrl} className="row-span-full" onClick={openProfile}>
        <Avatar id={user.id} name={user.nickname} avatarId={user.avatarId} size="3rem" className="rounded-sm" />
      </a>
      <div>
        <a href={profileUrl} onClick={openProfile} className="text-lg text-brand-700">
          {user.nickname}
        </a>

        {isAdmin && (
          <span className="ml-2">
            <Badge>
              {spaceOwnerId === user.id ? (
                <FormattedMessage defaultMessage="Owner" />
              ) : (
                <FormattedMessage defaultMessage="Admin" />
              )}
            </Badge>
          </span>
        )}
        {thisIsMe && (
          <span className="ml-2">
            <Badge>
              <FormattedMessage defaultMessage="Me" />
            </Badge>
          </span>
        )}
      </div>

      <div className="text-surface-400">{user.username}</div>
      {amIAdmin && !thisIsMe && (
        <div className="row-span-full relative">
          <InListButton active={isShowOperation} onClick={() => setShowOperation((x) => !x)}>
            <span>…</span>
          </InListButton>
          {isShowOperation && (
            <div className="absolute top-0 right-full px-1">
              <ExileButton spaceId={spaceMembership.spaceId} userId={user.id} />
            </div>
          )}
        </div>
      )}
    </div>
  );
};
