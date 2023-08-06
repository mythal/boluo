import { SpaceMemberWithUser } from 'api';
import { useMe } from 'common';
import { Globe, Key, Settings, Users } from 'icons';
import { FC, ReactNode, useCallback, useMemo } from 'react';
import { FormattedMessage } from 'react-intl';
import Icon from 'ui/Icon';
import { usePaneAdd } from '../../hooks/usePaneAdd';
import { useQuerySpace } from '../../hooks/useQuerySpace';
import { useQuerySpaceMembers } from '../../hooks/useQuerySpaceMembers';
import { PaneBox } from '../PaneBox';
import { PaneHeaderBox } from '../PaneHeaderBox';
import { PaneLoading } from '../PaneLoading';
import { SidebarHeaderButton } from '../sidebar/SidebarHeaderButton';
import { Badge } from './Badge';
import { SpaceJoinButton } from './SpaceJoinButton';
import { SpaceLeaveButton } from './SpaceLeaveButton';
import { SpaceMemberBadge } from './SpaceMemberBadge';

interface Props {
  spaceId: string;
}

export const PaneSpace: FC<Props> = ({ spaceId }) => {
  const { data: space, isLoading } = useQuerySpace(spaceId);
  const { data: spaceMembers, isLoading: isSpaceMembersLoading } = useQuerySpaceMembers(spaceId);
  const me = useMe();
  const myId = me === 'LOADING' || me == null ? null : me.user.id;
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
  const addPane = usePaneAdd();
  const openSettings = useCallback(() => {
    console.log('openSettings');
    addPane({ type: 'SPACE_SETTINGS', spaceId });
  }, [addPane, spaceId]);
  const operators = useMemo(() => {
    if (space == null || myId == null) {
      return null;
    }
    if (space.ownerId === myId || mySpaceMember?.space.isAdmin) {
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
          <SidebarHeaderButton icon={<Settings />} onClick={openSettings}>
            <span className="hidden @xl:inline">
              <FormattedMessage defaultMessage="Space Settings" />
            </span>
          </SidebarHeaderButton>
        </>
      );
    }

    return null;
  }, [isSpaceMembersLoading, myId, mySpaceMember, openSettings, space]);
  if (isLoading || !space) {
    return <PaneLoading />;
  }
  const { description, isPublic } = space;
  return (
    <PaneBox header={<PaneHeaderBox operators={operators}>{space.name}</PaneHeaderBox>}>
      <div className="p-4">
        <div className="text-2xl pb-2 flex items-end gap-2">
          {space.name}
        </div>

        <div className="py-2 flex gap-2">
          <Badge>
            <Icon
              icon={isPublic ? Globe : Key}
            />
            {isPublic
              ? <FormattedMessage defaultMessage="Public" />
              : <FormattedMessage defaultMessage="Private" />}
          </Badge>

          <SpaceMemberBadge spaceId={spaceId} members={spaceMemberList} />
        </div>

        {description !== '' && (
          <div className="whitespace-pre">
            {description}
          </div>
        )}
      </div>
    </PaneBox>
  );
};
