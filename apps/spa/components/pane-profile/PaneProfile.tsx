import { useQueryCurrentUser } from '@boluo/hooks/useQueryCurrentUser';
import { useQueryUser } from '@boluo/hooks/useQueryUser';
import { Edit, LogOut, User } from '@boluo/icons';
import { type FC, useState } from 'react';
import { FormattedMessage, useIntl } from 'react-intl';
import { Loading } from '@boluo/ui/Loading';
import { toggle } from '@boluo/utils/function';
import { useLogout } from '@boluo/hooks/useLogout';
import { PaneBox } from '../PaneBox';
import { PaneHeaderBox } from '../PaneHeaderBox';
import { PaneHeaderButton } from '@boluo/ui/PaneHeaderButton';
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
        <PaneHeaderButton onClick={logout} title={logoutLabel}>
          <LogOut />
          <span className="hidden text-xs @xs:inline">
            <FormattedMessage defaultMessage="Logout" />
          </span>
        </PaneHeaderButton>
      )}
      {isMe && (
        <PaneHeaderButton active={isEditing} onClick={() => setIsEditing(toggle)} title={editLabel}>
          <Edit />
          <span className="hidden text-xs @md:inline">
            <FormattedMessage defaultMessage="Edit" />
          </span>
        </PaneHeaderButton>
      )}
    </>
  );
  return (
    <PaneBox
      header={
        <PaneHeaderBox operators={operators} icon={isEditing ? <Edit /> : <User />}>
          {user.nickname}{' '}
          {isMe && (
            <span className="text-text-muted">
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
