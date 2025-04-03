import { useQueryCurrentUser } from '@boluo/common';
import { LogOut, Settings, User as UserIcon } from '@boluo/icons';
import { useAtom } from 'jotai';
import { type FC } from 'react';
import { useId } from 'react';
import { FormattedMessage } from 'react-intl';
import { Button } from '@boluo/ui/Button';
import { type ChildrenProps } from '@boluo/utils';
import { useLogout } from '@boluo/common/hooks/useLogout';
import { usePaneAdd } from '../../hooks/usePaneAdd';
import { devMode as devModeAtom } from '../../state/dev.atoms';
import { PaneBox } from '../PaneBox';
import { PaneHeaderBox } from '../PaneHeaderBox';
import { EneterSendField } from './EnterSendField';
import { LocaleSelect } from './LocaleSelect';
import { ThemeSelect } from './ThemeSelect';
import { type User } from '@boluo/api';
import { EditDefaultColor } from './EditDefaultColor';

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

const LogoutField: FC<{ currentUser: User }> = ({ currentUser }) => {
  const logout = useLogout();
  const addPane = usePaneAdd();
  const openProfile = () => {
    addPane({ type: 'PROFILE', userId: currentUser.id });
  };

  return (
    <div className="@md:items-center @md:flex-row flex select-none flex-col justify-between gap-4">
      <div className="text-lg">
        {currentUser.nickname} <span className="text-sm">({currentUser.username})</span>
      </div>
      <div className="flex flex-none gap-2">
        <Button onClick={openProfile}>
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

const AccountFields: FC<{ currentUser: User }> = ({ currentUser }) => {
  return (
    <div className="flex flex-col gap-4">
      <SectionTitle>
        <FormattedMessage defaultMessage="Account" />
      </SectionTitle>

      <LogoutField currentUser={currentUser} />
    </div>
  );
};

export const PaneSettings: FC = () => {
  const { data: currentUser } = useQueryCurrentUser();
  const [devMode, setDevMode] = useAtom(devModeAtom);
  return (
    <PaneBox
      header={
        <PaneHeaderBox icon={<Settings />}>
          <FormattedMessage defaultMessage="Settings" />
        </PaneHeaderBox>
      }
    >
      <div className="p-pane flex min-w-[18rem] max-w-lg flex-col gap-16">
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
            <AccountFields currentUser={currentUser} />

            <EditDefaultColor currentUser={currentUser} />
          </>
        )}
        <div>
          <SectionTitle>Developer Mode</SectionTitle>
          <div>
            <Button variant="switch" on={devMode} onClick={() => setDevMode(!devMode)}>
              Turn On Developer Mode
            </Button>
          </div>
        </div>
      </div>
    </PaneBox>
  );
};

export default PaneSettings;
