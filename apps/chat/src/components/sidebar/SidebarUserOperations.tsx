import { useMe } from 'common';
import { LogOut, User, X } from 'icons';
import { FC, useCallback } from 'react';
import { FormattedMessage, useIntl } from 'react-intl';
import { Button } from 'ui';
import { useLogout } from '../../hooks/useLogout';
import { useChatPaneDispatch } from '../../state/chat-view';
import { makePane } from '../../types/chat-pane';
import { SidebarItem } from './SidebarItem';

interface Props {
  isProfileOpen: boolean;
  close: () => void;
}

export const SidebarUserOperations: FC<Props> = ({ close, isProfileOpen }) => {
  const me = useMe();
  const logout = useLogout();
  const dispatch = useChatPaneDispatch();
  const handleToggleProfile = useCallback(() => {
    if (!me) {
      return;
    }
    dispatch({ type: 'TOGGLE', pane: makePane({ type: 'PROFILE', userId: me.user.id }) });
  }, [dispatch, me]);
  if (!me) {
    return null;
  }
  return (
    <div className="">
      <div className="flex items-center justify-between px-4 py-3 group">
        <div className="text-surface-600 text-sm">
          <FormattedMessage defaultMessage="My" />
        </div>
        <div>
          <button onClick={close} className="border p-1 rounded text-sm group-hover:border-surface-300">
            <X />
          </button>
        </div>
      </div>
      <SidebarItem icon={<User />} active={isProfileOpen} toggle onClick={handleToggleProfile}>
        {me.user.nickname}
      </SidebarItem>
      <div className="px-4 pt-2 pb-2 text-right">
        <Button data-small onClick={logout}>
          <LogOut />
          <FormattedMessage defaultMessage="Logout" />
        </Button>
      </div>
    </div>
  );
};
