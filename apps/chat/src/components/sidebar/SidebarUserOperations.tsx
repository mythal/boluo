import { useMe } from 'common';
import { X } from 'icons';
import { FC } from 'react';
import { FormattedMessage } from 'react-intl';
import { Button } from 'ui';
import { useLogout } from '../../hooks/useLogout';

interface Props {
  close: () => void;
}

export const SidebarUserOperations: FC<Props> = ({ close }) => {
  const me = useMe();
  const logout = useLogout();
  if (!me) {
    return null;
  }
  return (
    <div>
      <div className="flex items-center justify-between px-4 py-3">
        {me.user.nickname}
        <button onClick={close} className="border p-1 rounded text-sm">
          <X />
        </button>
      </div>
      <div className="flex items-center justify-between px-4 py-2 border-b">
        <Button data-small onClick={logout}>
          <FormattedMessage defaultMessage="Logout" />
        </Button>
      </div>
    </div>
  );
};
