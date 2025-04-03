import { useQueryCurrentUser, useQueryUser } from '@boluo/common';
import { Edit, LogOut, User } from '@boluo/icons';
import { type FC, useState } from 'react';
import { FormattedMessage, useIntl } from 'react-intl';
import { Loading } from '@boluo/ui/Loading';
import { toggle } from '@boluo/utils';
import { useLogout } from '@boluo/common/hooks/useLogout';
import { PaneBox } from '../PaneBox';
import { PaneHeaderBox } from '../PaneHeaderBox';
import { SidebarHeaderButton } from '../sidebar/SidebarHeaderButton';
import { PaneProfileEdit } from './PaneProfileEdit';
import { PaneProfileNotFound } from './PaneProfileNotFound';
import { PaneProfileView } from './PaneProfileView';
import { PaneFailed } from '../pane-failed/PaneFailed';

interface Props {
  userId: string;
}

export const PaneProfile: FC<Props> = ({ userId }) => {
  const { data: currentUser } = useQueryCurrentUser();
  const { isLoading, data: user, error } = useQueryUser(userId);
  const isMe = currentUser?.id === userId;
  const [isEditing, setIsEditing] = useState(false);
  const intl = useIntl();
  const logoutLabel = intl.formatMessage({ defaultMessage: 'Logout' });
  const editLabel = intl.formatMessage({ defaultMessage: 'Edit' });
  const logout = useLogout();

  if (isLoading) {
    return <Loading />;
  } else if (error != null && user == null) {
    return (
      <PaneFailed
        code={error.code}
        title={<FormattedMessage defaultMessage="Failed to query the user" />}
      />
    );
  } else if (user == null) {
    return <PaneProfileNotFound />;
  }
  const operators = (
    <>
      {isMe && (
        <SidebarHeaderButton onClick={logout} title={logoutLabel}>
          <LogOut />
          <span className="@xs:inline hidden text-xs">
            <FormattedMessage defaultMessage="Logout" />
          </span>
        </SidebarHeaderButton>
      )}
      {isMe && (
        <SidebarHeaderButton
          active={isEditing}
          onClick={() => setIsEditing(toggle)}
          title={editLabel}
        >
          <Edit />
          <span className="@md:inline hidden text-xs">
            <FormattedMessage defaultMessage="Edit" />
          </span>
        </SidebarHeaderButton>
      )}
    </>
  );
  return (
    <PaneBox
      header={
        <PaneHeaderBox operators={operators} icon={isEditing ? <Edit /> : <User />}>
          {user.nickname}{' '}
          {isMe && (
            <span className="text-text-lighter">
              <FormattedMessage defaultMessage="(me)" />
            </span>
          )}
        </PaneHeaderBox>
      }
    >
      {isMe && isEditing ? (
        <PaneProfileEdit onSuccess={() => setIsEditing(false)} me={currentUser} />
      ) : (
        <PaneProfileView user={user} />
      )}
    </PaneBox>
  );
};

export default PaneProfile;
