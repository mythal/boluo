import { useMe, useUser } from 'common';
import { Edit, LogOut, User } from 'icons';
import { FC, useState } from 'react';
import { FormattedMessage, useIntl } from 'react-intl';
import { Button } from 'ui/Button';
import { Loading } from 'ui/Loading';
import { toggle } from 'utils';
import { useLogout } from '../../hooks/useLogout';
import { ErrorDisplay } from '../ErrorDisplay';
import { PaneBox } from '../PaneBox';
import { PaneHeaderBox } from '../PaneHeaderBox';
import { SidebarHeaderButton } from '../sidebar/SidebarHeaderButton';
import { PaneProfileEdit } from './PaneProfileEdit';
import { PaneProfileNotFound } from './PaneProfileNotFound';
import { PaneProfileView } from './PaneProfileView';

interface Props {
  userId: string;
}

export const PaneProfile: FC<Props> = ({ userId }) => {
  const me = useMe();
  const { isLoading, data: user, error } = useUser(userId);
  const isMe = me != null && me !== 'LOADING' && me.user.id === userId;
  const [isEditing, setIsEditing] = useState(false);
  const intl = useIntl();
  const logoutLabel = intl.formatMessage({ defaultMessage: 'Logout' });
  const editLabel = intl.formatMessage({ defaultMessage: 'Edit' });
  const logout = useLogout();

  if (isLoading) {
    return <Loading />;
  } else if (error) {
    return <ErrorDisplay error={error} />;
  } else if (user == null) {
    return <PaneProfileNotFound />;
  }
  const operators = (
    <>
      {isMe && (
        <SidebarHeaderButton onClick={logout} title={logoutLabel}>
          <LogOut />
          <span className="@xs:inline hidden">
            <FormattedMessage defaultMessage="Logout" />
          </span>
        </SidebarHeaderButton>
      )}
      {isMe && (
        <SidebarHeaderButton active={isEditing} onClick={() => setIsEditing(toggle)} title={editLabel}>
          <Edit />
          <span className="@md:inline hidden">
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
            <span className="text-surface-500">
              <FormattedMessage defaultMessage="(me)" />
            </span>
          )}
        </PaneHeaderBox>
      }
    >
      {isMe && isEditing ? (
        <PaneProfileEdit onSuccess={() => setIsEditing(false)} me={me.user} />
      ) : (
        <PaneProfileView user={user} />
      )}
    </PaneBox>
  );
};

export default PaneProfile;
