import { type SpaceMemberWithUser } from '@boluo/api';
import { useQueryCurrentUser } from '@boluo/hooks/useQueryCurrentUser';
import { Globe, Key, MoonStar } from '@boluo/icons';
import { type FC, type ReactNode, useMemo } from 'react';
import { FormattedMessage } from 'react-intl';
import { Badge } from '@boluo/ui/Badge';
import Icon from '@boluo/ui/Icon';
import { useQuerySpace } from '@boluo/hooks/useQuerySpace';
import { useQuerySpaceMembers } from '@boluo/hooks/useQuerySpaceMembers';
import { PaneBox } from '../PaneBox';
import { PaneHeaderBox } from '../PaneHeaderBox';
import { PaneLoading } from '../PaneLoading';
import { SpaceJoinButton } from './SpaceJoinButton';
import { SpaceLeaveButton } from './SpaceLeaveButton';
import { SpaceMemberBadge } from './SpaceMemberBadge';
import { SpaceSettingsButton } from './SpaceSettingsButton';

interface Props {
  spaceId: string;
}

export const PaneSpace: FC<Props> = ({ spaceId }) => {
  const { data: currentUser } = useQueryCurrentUser();
  const { data: space, isLoading } = useQuerySpace(spaceId);
  const { data: spaceMembers, isLoading: isSpaceMembersLoading } = useQuerySpaceMembers(spaceId);
  const myId = currentUser?.id ?? null;
  const spaceMemberList = useMemo(() => {
    if (spaceMembers == null) {
      return null;
    }
    return Object.values(spaceMembers);
  }, [spaceMembers]);

  const mySpaceMember: SpaceMemberWithUser | null = useMemo(() => {
    if (spaceMembers == null || myId == null) {
      return null;
    }
    const entry = spaceMembers[myId];
    if (entry != null) {
      return entry;
    }
    return null;
  }, [myId, spaceMembers]);
  const operators = useMemo(() => {
    if (space == null || myId == null) {
      return null;
    }
    let toggleMembershipButton: ReactNode = null;
    if (isSpaceMembersLoading) {
      // pass
    }
    if (mySpaceMember != null) {
      toggleMembershipButton = <SpaceLeaveButton space={space} mySpaceMember={mySpaceMember} />;
    } else if (space.isPublic) {
      toggleMembershipButton = <SpaceJoinButton spaceId={space.id} />;
    }
    return (
      <>
        {toggleMembershipButton}
        {(space.ownerId === myId || mySpaceMember?.space.isAdmin) && (
          <SpaceSettingsButton spaceId={space.id} />
        )}
      </>
    );
  }, [isSpaceMembersLoading, myId, mySpaceMember, space]);
  if (isLoading || !space) {
    return <PaneLoading initSizeLevel={1} />;
  }
  const { description, isPublic } = space;
  return (
    <PaneBox
      initSizeLevel={1}
      header={
        <PaneHeaderBox icon={<MoonStar />} operators={operators}>
          {space.name}
        </PaneHeaderBox>
      }
    >
      <div className="p-pane">
        <div className="flex items-end gap-2 pb-2 text-2xl">{space.name}</div>

        <div className="flex gap-2 py-2">
          <Badge>
            <Icon icon={isPublic ? Globe : Key} />
            {isPublic ? (
              <FormattedMessage defaultMessage="Public" />
            ) : (
              <FormattedMessage defaultMessage="Private" />
            )}
          </Badge>

          <SpaceMemberBadge spaceId={spaceId} members={spaceMemberList} />
        </div>

        {description !== '' && (
          <div className="max-w-md py-2 whitespace-pre-line">{description}</div>
        )}
      </div>
    </PaneBox>
  );
};
