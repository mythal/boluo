import { useMe } from 'common';
import { X } from 'icons';
import { FC, useCallback } from 'react';
import { FormattedMessage } from 'react-intl';
import { Button } from 'ui';
import { useLogout } from '../../hooks/useLogout';
import { useChatPaneDispatch } from '../../state/chat-view';
import { makePane } from '../../types/chat-pane';

interface Props {
  close: () => void;
}

export const SidebarUserOperations: FC<Props> = ({ close }) => {
  const me = useMe();
  const logout = useLogout();
  const dispatch = useChatPaneDispatch();
  const handleOpenProfile = useCallback(() => {
    if (!me) {
      return;
    }
    dispatch({ type: 'TOGGLE', pane: makePane({ type: 'PROFILE', userId: me.user.id }) });
    close();
  }, [close, dispatch, me]);
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
        <Button data-small onClick={handleOpenProfile}>
          <FormattedMessage defaultMessage="Profile" />
        </Button>
        <Button data-small onClick={logout}>
          <FormattedMessage defaultMessage="Logout" />
        </Button>
      </div>
    </div>
  );
};
