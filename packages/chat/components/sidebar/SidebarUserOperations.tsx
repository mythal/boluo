import clsx from 'clsx';
import { useMe } from 'common';
import { HelpCircle, LogIn, Settings, User } from 'icons';
import { atom, useAtom, useAtomValue } from 'jotai';
import { atomWithStorage } from 'jotai/utils';
import { FC, useCallback, useMemo } from 'react';
import { FormattedMessage } from 'react-intl';
import { toggle } from 'utils';
import { usePaneToggle } from '../../hooks/usePaneToggle';
import { panesAtom } from '../../state/view.atoms';
import { Avatar } from '../account/Avatar';
import { SidebarGroupHeader } from './SidebarGroupHeader';
import { SidebarItem } from './SidebarItem';

interface Props {}

export const isUserOperationsFoldedAtom = atomWithStorage('isUserOperationsFolded:v0', false);

export const isSettingsOpenAtom = atom((get) => {
  const panes = get(panesAtom);
  return panes.findIndex((pane) => pane.type === 'SETTINGS') !== -1;
});

export const isHelpOpenAtom = atom((get) => {
  const panes = get(panesAtom);
  return panes.findIndex((pane) => pane.type === 'HELP') !== -1;
});

export const isLoginOpenAtom = atom((get) => {
  const panes = get(panesAtom);
  return panes.findIndex((pane) => pane.type === 'LOGIN') !== -1;
});

export const isProfileOpenAtom = atom<(id: string) => boolean>((get) => {
  const panes = get(panesAtom);
  return (id: string) => panes.findIndex((pane) => pane.type === 'PROFILE' && pane.userId === id) !== -1;
});
export const SidebarUserOperations: FC<Props> = () => {
  const me = useMe();
  const isLoginOpen = useAtomValue(isLoginOpenAtom);
  const isHelpOpen = useAtomValue(isHelpOpenAtom);
  const isSettingsOpen = useAtomValue(isSettingsOpenAtom);
  const isProfileOpen = useAtomValue(isProfileOpenAtom);
  const [folded, setFolded] = useAtom(isUserOperationsFoldedAtom);
  const toggleFolded = useCallback(() => setFolded(toggle), [setFolded]);
  const togglePane = usePaneToggle();
  const handleToggleLogin = useCallback(() => {
    if (me) {
      return;
    }
    togglePane({ type: 'LOGIN' });
  }, [me, togglePane]);
  const handleToggleSettings = useCallback(() => {
    togglePane({ type: 'SETTINGS' });
  }, [togglePane]);
  const handleToggleProfile = useCallback(() => {
    if (!me || me === 'LOADING') {
      return;
    }
    togglePane({ type: 'PROFILE', userId: me.user.id });
  }, [me, togglePane]);
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
  const toggleHelp = useCallback(() => togglePane({ type: 'HELP' }), [togglePane]);
  const helpItem = useMemo(
    () => (
      <SidebarItem icon={<HelpCircle />} active={isHelpOpen} toggle onClick={toggleHelp}>
        <FormattedMessage defaultMessage="Help" />
      </SidebarItem>
    ),
    [isHelpOpen, toggleHelp],
  );
  if (me === 'LOADING') {
    return <div className="" />;
  }
  return (
    <div className={'pt-2'}>
      {!folded && me && (
        <>
          {settingsItem}
          {helpItem}
          <SidebarItem icon={<User />} active={isProfileOpen(me.user.id)} toggle onClick={handleToggleProfile}>
            <FormattedMessage defaultMessage="Profile" />
          </SidebarItem>
        </>
      )}

      {me ? (
        <SidebarGroupHeader folded={folded} toggle={toggleFolded}>
          <Avatar
            size={32}
            id={me.user.id}
            name={me.user.nickname}
            avatarId={me.user.avatarId}
            className={clsx('h-6 w-6 rounded')}
          />
          <div className="min-w-0 overflow-hidden text-ellipsis whitespace-nowrap">{me.user.nickname}</div>
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
