import { useQueryCurrentUser } from '@boluo/common/hooks/useQueryCurrentUser';
import { LogOut, Settings, User as UserIcon } from '@boluo/icons';
import { useAtom } from 'jotai';
import { type FC } from 'react';
import { useId } from 'react';
import { FormattedMessage } from 'react-intl';
import { Button } from '@boluo/ui/Button';
import { ButtonWithLamp } from '@boluo/ui/ButtonWithLamp';
import { type ChildrenProps } from '@boluo/utils/types';
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
import { HelpText } from '@boluo/ui/HelpText';

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
    <div className="flex flex-col justify-between gap-4 select-none @md:flex-row @md:items-center">
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
            <AccountFields currentUser={currentUser} />

            <EditDefaultColor currentUser={currentUser} />
          </>
        )}
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
