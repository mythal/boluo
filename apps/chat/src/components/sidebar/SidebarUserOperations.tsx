import clsx from 'clsx';
import { useMe } from 'common';
import { HelpCircle, LogIn, Settings, User } from 'icons';
import { FC, useCallback, useMemo, useState } from 'react';
import { FormattedMessage } from 'react-intl';
import { toggle } from 'utils';
import { useChatPaneDispatch } from '../../state/chat-view';
import { makePane } from '../../types/chat-pane';
import { Avatar } from '../account/Avatar';
import { SidebarGroupHeader } from './SidebarGroupHeader';
import { SidebarItem } from './SidebarItem';
import { useSidebarState } from './useSidebarState';

interface Props {
  isProfileOpen: boolean;
  isSettingsOpen: boolean;
  isLoginOpen: boolean;
  isHelpOpen: boolean;
}

export const SidebarUserOperations: FC<Props> = (
  { isProfileOpen, isLoginOpen, isSettingsOpen, isHelpOpen },
) => {
  const me = useMe();
  const { isExpanded } = useSidebarState();
  const [folded, setFolded] = useState(true);
  const toggleFolded = useCallback(() => setFolded(toggle), []);
  const dispatch = useChatPaneDispatch();
  const handleToggleLogin = useCallback(() => {
    if (me) {
      return;
    }
    dispatch({ type: 'TOGGLE', pane: makePane({ type: 'LOGIN' }) });
  }, [dispatch, me]);
  const handleToggleSettings = useCallback(() => {
    dispatch({ type: 'TOGGLE', pane: makePane({ type: 'SETTINGS' }) });
  }, [dispatch]);
  const handleToggleProfile = useCallback(() => {
    if (!me) {
      return;
    }
    dispatch({ type: 'TOGGLE', pane: makePane({ type: 'PROFILE', userId: me.user.id }) });
  }, [dispatch, me]);
  const loginItem = !me && (
    <SidebarItem icon={<LogIn />} toggle onClick={handleToggleLogin} active={isLoginOpen}>
      <FormattedMessage defaultMessage="Login" />
    </SidebarItem>
  );
  const settingsItem = (
    <SidebarItem icon={<Settings />} active={isSettingsOpen} toggle onClick={handleToggleSettings}>
      <FormattedMessage defaultMessage="Settings" />
    </SidebarItem>
  );
  const toggleHelp = useCallback(() => dispatch({ type: 'TOGGLE', pane: makePane({ type: 'HELP' }) }), [dispatch]);
  const helpItem = useMemo(() => (
    <SidebarItem icon={<HelpCircle />} active={isHelpOpen} toggle onClick={toggleHelp}>
      <FormattedMessage defaultMessage="Help" />
    </SidebarItem>
  ), [isHelpOpen, toggleHelp]);
  if (!isExpanded) {
    return (
      <div>
        {settingsItem}
        {helpItem}
        {!me && loginItem}
      </div>
    );
  }
  return (
    <div className={folded ? '' : 'border-t'}>
      {!folded && me && (
        <>
          {settingsItem}
          {helpItem}
          <SidebarItem icon={<User />} active={isProfileOpen} toggle onClick={handleToggleProfile}>
            <FormattedMessage defaultMessage="Profile" />
          </SidebarItem>
        </>
      )}

      {me
        ? (
          <SidebarGroupHeader folded={folded} toggle={toggleFolded}>
            <Avatar
              size={32}
              id={me.user.id}
              name={me.user.nickname}
              avatarId={me.user.avatarId}
              className={clsx(
                'w-6 h-6 rounded',
              )}
            />
            <div className="overflow-hidden whitespace-nowrap text-ellipsis min-w-0">
              {me.user.nickname}
            </div>
          </SidebarGroupHeader>
        )
        : (
          <>
            {helpItem}
            {settingsItem}
            {loginItem}
          </>
        )}
    </div>
  );
};
