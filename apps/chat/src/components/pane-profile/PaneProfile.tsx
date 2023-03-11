import { useMe, useUser } from 'common';
import { Edit, User } from 'icons';
import { FC, useState } from 'react';
import { FormattedMessage } from 'react-intl';
import { Button } from 'ui';
import { toggle } from 'utils';
import { ClosePaneButton } from '../ClosePaneButton';
import { PaneBodyBox } from '../PaneBodyBox';
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
  const userQuery = useUser(userId);
  const user = userQuery.data;
  const isMe = me?.user.id === userId;
  const [isEditing, setIsEditing] = useState(false);

  if (!user) {
    return <PaneProfileNotFound />;
  }
  const operators = (
    <>
      {isMe && (
        <Button data-small data-type="switch" data-on={isEditing} onClick={() => setIsEditing(toggle)}>
          <Edit />
          <FormattedMessage defaultMessage="Edit" />
        </Button>
      )}

      <ClosePaneButton />
    </>
  );
  return (
    <PaneBox>
      <PaneHeaderBox operators={operators} icon={isEditing ? <Edit /> : <User />}>
        {user.nickname} {isMe && (
          <span className="text-surface-500">
            <FormattedMessage defaultMessage="(me)" />
          </span>
        )}
      </PaneHeaderBox>
      <PaneBodyBox>
        {(isMe && isEditing)
          ? <PaneProfileEdit exit={() => setIsEditing(false)} me={me.user} />
          : <PaneProfileView user={user} />}
      </PaneBodyBox>
    </PaneBox>
  );
};
