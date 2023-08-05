import { useMe } from 'common';
import { LogOut, Settings, User } from 'icons';
import { useAtom } from 'jotai';
import { FC } from 'react';
import { useId } from 'react';
import { FormattedMessage } from 'react-intl';
import { Button } from 'ui/Button';
import { ChildrenProps } from 'utils';
import { useLogout } from '../../hooks/useLogout';
import { usePaneAdd } from '../../hooks/usePaneAdd';
import { devMode as devModeAtom } from '../../state/dev.atoms';
import { PaneBox } from '../PaneBox';
import { PaneHeaderBox } from '../PaneHeaderBox';
import { EneterSendField } from './EnterSendField';
import { ExpandDiceSwitch } from './ExpandDiceSwitch';
import { LocaleSelect } from './LocaleSelect';
import { ThemeSelect } from './ThemeSelect';

const SectionTitle: FC<ChildrenProps> = ({ children }) => <h3 className="font-bold mb-2">{children}</h3>;

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

const ExpandDiceField = () => {
  return (
    <label className="flex items-center justify-between gap-4 select-none">
      <FormattedMessage defaultMessage="Expand dice in the messages" />
      <ExpandDiceSwitch />
    </label>
  );
};

const LogoutField = () => {
  const logout = useLogout();
  const me = useMe();
  const addPane = usePaneAdd();
  const openProfile = () => {
    if (me != null && me !== 'LOADING') {
      addPane({ type: 'PROFILE', userId: me.user.id });
    }
  };
  if (me == null) {
    console.error("Unexpected null value for 'me'");
    return null;
  }
  if (me === 'LOADING') {
    return null;
  }
  return (
    <div className="flex justify-between @md:items-center gap-4 select-none flex-col @md:flex-row">
      <div className="text-lg">
        {me.user.nickname} <span className="text-sm">({me.user.username})</span>
      </div>
      <div className="flex gap-2 flex-none">
        <Button onClick={openProfile}>
          <User />
          <FormattedMessage defaultMessage="Profile" />
        </Button>
        <Button onClick={logout}>
          <LogOut />
          <FormattedMessage defaultMessage="Logout" />
        </Button>
      </div>
    </div>
  );
};

const AccountFields = () => {
  return (
    <div className="flex flex-col gap-4">
      <SectionTitle>
        <FormattedMessage defaultMessage="Account" />
      </SectionTitle>

      <LogoutField />
    </div>
  );
};

export const PaneSettings: FC = () => {
  const me = useMe();
  const [devMode, setDevMode] = useAtom(devModeAtom);
  return (
    <PaneBox
      header={
        <PaneHeaderBox icon={<Settings />}>
          <FormattedMessage defaultMessage="Settings" />
        </PaneHeaderBox>
      }
    >
      <div className="p-4 flex flex-col gap-8 min-w-[18rem] max-w-lg">
        <div className="flex flex-col gap-4">
          <SectionTitle>
            <FormattedMessage defaultMessage="Interface" />
          </SectionTitle>
          <LanguageField />
          <ThemeField />
          {me && <EneterSendField />}
          {me && <ExpandDiceField />}
        </div>
        {me && <AccountFields />}
        <div>
          <SectionTitle>Developer Mode</SectionTitle>
          <div>
            <Button data-type="switch" data-on={devMode} onClick={() => setDevMode(!devMode)}>
              Turn On Developer Mode
            </Button>
          </div>
        </div>
      </div>
    </PaneBox>
  );
};

export default PaneSettings;
