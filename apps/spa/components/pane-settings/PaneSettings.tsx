import { useQueryCurrentUser } from '@boluo/common/hooks/useQueryCurrentUser';
import { LogOut, Settings, User as UserIcon } from '@boluo/icons';
import { useAtom, useAtomValue } from 'jotai';
import { type FC, useCallback } from 'react';
import { useId } from 'react';
import { FormattedMessage } from 'react-intl';
import { Button } from '@boluo/ui/Button';
import { ButtonWithLamp } from '@boluo/ui/ButtonWithLamp';
import { type ChildrenProps } from '@boluo/types';
import { useLogout } from '@boluo/common/hooks/useLogout';
import { usePaneToggle } from '../../hooks/usePaneToggle';
import { devMode as devModeAtom } from '../../state/dev.atoms';
import { PaneBox } from '../PaneBox';
import { PaneHeaderBox } from '../PaneHeaderBox';
import { EneterSendField } from './EnterSendField';
import { LocaleSelect } from './LocaleSelect';
import { ThemeSelect } from './ThemeSelect';
import { type User } from '@boluo/api';
import { EditDefaultColor } from './EditDefaultColor';
import { HelpText } from '@boluo/ui/HelpText';
import { isProfileOpenAtom } from '../sidebar/SidebarUserOperations';
import { CustomThemeOverridesField } from './CustomThemeOverridesField';

const SectionTitle: FC<ChildrenProps> = ({ children }) => (
  <h3 className="mb-2 font-bold">{children}</h3>
);

const LanguageField = () => {
  const id = useId();
  return (
    <div>
      <label className="block pb-1" htmlFor={id}>
        <FormattedMessage defaultMessage="Language" />
      </label>
      <LocaleSelect id={id} />
    </div>
  );
};

const ThemeField = () => {
  const id = useId();
  return (
    <div>
      <label htmlFor={id} className="block pb-1">
        <FormattedMessage defaultMessage="Theme" />
      </label>
      <ThemeSelect id={id} />
    </div>
  );
};

interface LogoutFieldProps {
  currentUser: User;
  onToggleProfile: () => void;
  profilePaneActive: boolean;
}

const LogoutField: FC<LogoutFieldProps> = ({ currentUser, onToggleProfile, profilePaneActive }) => {
  const logout = useLogout();

  return (
    <div className="flex flex-col justify-between gap-4 select-none @md:flex-row @md:items-center">
      <div className="text-lg">
        {currentUser.nickname} <span className="text-sm">({currentUser.username})</span>
      </div>
      <div className="flex flex-none gap-2">
        <Button onClick={onToggleProfile} active={profilePaneActive}>
          <UserIcon />
          <span>
            <FormattedMessage defaultMessage="Profile" />
          </span>
        </Button>
        <Button onClick={logout}>
          <LogOut />
          <span>
            <FormattedMessage defaultMessage="Logout" />
          </span>
        </Button>
      </div>
    </div>
  );
};

interface AccountFieldsProps {
  currentUser: User;
  onToggleProfile: () => void;
  profilePaneActive: boolean;
}

const AccountFields: FC<AccountFieldsProps> = ({
  currentUser,
  onToggleProfile,
  profilePaneActive,
}) => {
  return (
    <div className="flex flex-col gap-4">
      <SectionTitle>
        <FormattedMessage defaultMessage="Account" />
      </SectionTitle>

      <LogoutField
        currentUser={currentUser}
        onToggleProfile={onToggleProfile}
        profilePaneActive={profilePaneActive}
      />
    </div>
  );
};

export const PaneSettings: FC = () => {
  const { data: currentUser } = useQueryCurrentUser();
  const [devMode, setDevMode] = useAtom(devModeAtom);
  const isProfileOpen = useAtomValue(isProfileOpenAtom);
  const togglePane = usePaneToggle();
  const handleToggleProfile = useCallback(() => {
    if (!currentUser) return;
    togglePane({ type: 'PROFILE', userId: currentUser.id });
  }, [currentUser, togglePane]);
  const profilePaneActive = currentUser ? isProfileOpen(currentUser.id) : false;
  return (
    <PaneBox
      header={
        <PaneHeaderBox icon={<Settings />}>
          <FormattedMessage defaultMessage="Settings" />
        </PaneHeaderBox>
      }
    >
      <div className="p-pane flex max-w-lg min-w-[18rem] flex-col gap-16">
        <div className="flex flex-col gap-4">
          <SectionTitle>
            <FormattedMessage defaultMessage="Interface" />
          </SectionTitle>
          <LanguageField />
          <ThemeField />
          {currentUser && <EneterSendField />}
          {/* {currentUser && <ExpandDiceField />} */}
        </div>
        {currentUser && (
          <>
            <AccountFields
              currentUser={currentUser}
              onToggleProfile={handleToggleProfile}
              profilePaneActive={profilePaneActive}
            />

            <EditDefaultColor currentUser={currentUser} />
          </>
        )}
        <div className="flex flex-col gap-4">
          <SectionTitle>
            <FormattedMessage defaultMessage="Customization" />
          </SectionTitle>
          <CustomThemeOverridesField />
        </div>
        <div>
          <SectionTitle>
            <FormattedMessage defaultMessage="Developer Options" />
          </SectionTitle>
          <div>
            <div className="py-2">
              <HelpText>
                <FormattedMessage defaultMessage="Enable this if you want to debug or develop features." />
              </HelpText>
            </div>
            <ButtonWithLamp on={devMode} onClick={() => setDevMode(!devMode)}>
              <FormattedMessage defaultMessage="Dev Mode" />
            </ButtonWithLamp>
          </div>
        </div>
      </div>
    </PaneBox>
  );
};

export default PaneSettings;
