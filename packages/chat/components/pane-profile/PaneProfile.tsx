import { useMe, useUser } from 'common';
import { Edit, LogOut, User } from 'icons';
import { FC, useState } from 'react';
import { FormattedMessage, useIntl } from 'react-intl';
import { Button } from 'ui/Button';
import { Loading } from 'ui/Loading';
import { toggle } from 'utils';
import { useLogout } from '../../hooks/useLogout';
import { ClosePaneButton } from '../ClosePaneButton';
import { PaneBox } from '../PaneBox';
import { PaneHeaderBox } from '../PaneHeaderBox';
import { PaneProfileEdit } from './PaneProfileEdit';
import { PaneProfileNotFound } from './PaneProfileNotFound';
import { PaneProfileView } from './PaneProfileView';

interface Props {
  userId: string;
}

export const PaneProfile: FC<Props> = ({ userId }) => {
  const me = useMe();
  const { isLoading, data: user } = useUser(userId);
  const isMe = me?.user.id === userId;
  const [isEditing, setIsEditing] = useState(false);
  const intl = useIntl();
  const logoutLabel = intl.formatMessage({ defaultMessage: 'Logout' });
  const editLabel = intl.formatMessage({ defaultMessage: 'Edit' });
  const logout = useLogout();

  if (isLoading) {
    return <Loading />;
  }
  if (!user) {
    return <PaneProfileNotFound />;
  }
  const operators = (
    <>
      {isMe && (
        <Button data-small onClick={logout} title={logoutLabel}>
          <LogOut />
          <span className="hidden @xs:inline">
            <FormattedMessage defaultMessage="Logout" />
          </span>
        </Button>
      )}
      {isMe && (
        <Button
          data-small
          data-type="switch"
          data-on={isEditing}
          onClick={() => setIsEditing(toggle)}
          title={editLabel}
        >
          <Edit />
          <span className="hidden @md:inline">
            <FormattedMessage defaultMessage="Edit" />
          </span>
        </Button>
      )}

      <ClosePaneButton />
    </>
  );
  return (
    <PaneBox
      header={
        <PaneHeaderBox operators={operators} icon={isEditing ? <Edit /> : <User />}>
          {user.nickname} {isMe && (
            <span className="text-surface-500">
              <FormattedMessage defaultMessage="(me)" />
            </span>
          )}
        </PaneHeaderBox>
      }
    >
      {(isMe && isEditing)
        ? <PaneProfileEdit exit={() => setIsEditing(false)} me={me.user} />
        : <PaneProfileView user={user} />}
    </PaneBox>
  );
};

export default PaneProfile;
