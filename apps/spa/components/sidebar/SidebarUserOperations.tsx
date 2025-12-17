import clsx from 'clsx';
import { HelpCircle, LogIn, Settings, User as UserIcon } from '@boluo/icons';
import { atom, useAtom, useAtomValue } from 'jotai';
import { atomWithStorage } from 'jotai/utils';
import { type FC, useCallback, useMemo } from 'react';
import { FormattedMessage } from 'react-intl';
import { toggle } from '@boluo/utils/function';
import { usePaneToggle } from '../../hooks/usePaneToggle';
import { panesAtom } from '../../state/view.atoms';
import { Avatar } from '@boluo/ui/users/Avatar';
import { SidebarGroupHeader } from './SidebarGroupHeader';
import { SidebarItem } from './SidebarItem';
import { type User } from '@boluo/api';
import { usePaneLimit } from '../../hooks/useMaxPane';
import { useQueryAppSettings } from '@boluo/hooks/useQueryAppSettings';

interface Props {
  currentUser: User | null | undefined;
}

export const isUserOperationsFoldedAtom = atomWithStorage('isUserOperationsFolded:v0', false);

export const isSettingsOpenAtom = atom((get) => {
  const panes = get(panesAtom);
  return (
    panes.findIndex((pane) => pane.type === 'SETTINGS' || pane.child?.pane.type === 'SETTINGS') !==
    -1
  );
});

export const isHelpOpenAtom = atom((get) => {
  const panes = get(panesAtom);
  return panes.findIndex((pane) => pane.type === 'HELP' || pane.child?.pane.type === 'HELP') !== -1;
});

export const isLoginOpenAtom = atom((get) => {
  const panes = get(panesAtom);
  return (
    panes.findIndex((pane) => pane.type === 'LOGIN' || pane.child?.pane.type === 'LOGIN') !== -1
  );
});

export const isProfileOpenAtom = atom<(id: string) => boolean>((get) => {
  const panes = get(panesAtom);
  return (id: string) =>
    panes.findIndex((pane) => pane.type === 'PROFILE' && pane.userId === id) !== -1;
});
export const SidebarUserOperations: FC<Props> = ({ currentUser }) => {
  const { data: appSettings } = useQueryAppSettings();
  const isLoginOpen = useAtomValue(isLoginOpenAtom);
  const isHelpOpen = useAtomValue(isHelpOpenAtom);
  const isSettingsOpen = useAtomValue(isSettingsOpenAtom);
  const isProfileOpen = useAtomValue(isProfileOpenAtom);
  const [folded, setFolded] = useAtom(isUserOperationsFoldedAtom);
  const toggleFolded = useCallback(() => setFolded(toggle), [setFolded]);
  const togglePane = usePaneToggle();
  const maxPane = usePaneLimit();
  const canToggle = maxPane > 1;
  const handleToggleLogin = useCallback(() => {
    if (currentUser != null) {
      return;
    }
    togglePane({ type: 'LOGIN' });
  }, [currentUser, togglePane]);
  const handleToggleSettings = useCallback(() => {
    togglePane({ type: 'SETTINGS' });
  }, [togglePane]);
  const handleToggleProfile = useCallback(() => {
    if (!currentUser) {
      return;
    }
    togglePane({ type: 'PROFILE', userId: currentUser.id });
  }, [currentUser, togglePane]);
  const loginItem = !currentUser && (
    <SidebarItem
      icon={<LogIn />}
      toggle={canToggle}
      onClick={handleToggleLogin}
      active={isLoginOpen}
    >
      <FormattedMessage defaultMessage="Login" />
    </SidebarItem>
  );
  const settingsItem = (
    <SidebarItem
      icon={<Settings />}
      active={isSettingsOpen}
      toggle={canToggle}
      onClick={handleToggleSettings}
    >
      <FormattedMessage defaultMessage="Settings" />
    </SidebarItem>
  );
  const toggleHelp = useCallback(() => togglePane({ type: 'HELP' }), [togglePane]);
  const helpItem = useMemo(
    () => (
      <SidebarItem
        icon={<HelpCircle />}
        active={isHelpOpen}
        toggle={canToggle}
        onClick={toggleHelp}
      >
        <FormattedMessage defaultMessage="Help" />
      </SidebarItem>
    ),
    [canToggle, isHelpOpen, toggleHelp],
  );
  return (
    <div className={'pt-2'}>
      {!folded && currentUser && (
        <>
          {settingsItem}
          {helpItem}
          <SidebarItem
            icon={<UserIcon />}
            active={isProfileOpen(currentUser.id)}
            toggle={canToggle}
            onClick={handleToggleProfile}
          >
            <FormattedMessage defaultMessage="Profile" />
          </SidebarItem>
        </>
      )}

      {currentUser ? (
        <SidebarGroupHeader folded={folded} toggle={toggleFolded}>
          <Avatar
            size={32}
            id={currentUser.id}
            name={currentUser.nickname}
            avatarId={currentUser.avatarId}
            className={clsx('h-6 w-6 rounded')}
            mediaUrl={appSettings?.mediaUrl}
          />
          <div className="min-w-0 overflow-hidden text-ellipsis whitespace-nowrap">
            {currentUser.nickname}
          </div>
        </SidebarGroupHeader>
      ) : (
        <>
          {helpItem}
          {settingsItem}
          {loginItem}
        </>
      )}
    </div>
  );
};
