import { useMe } from '@boluo/common';
import { LogOut, Settings, User } from '@boluo/icons';
import { useAtom } from 'jotai';
import { FC } from 'react';
import { useId } from 'react';
import { FormattedMessage } from 'react-intl';
import { Button } from '@boluo/ui/Button';
import { ChildrenProps } from '@boluo/utils';
import { useLogout } from '../../hooks/useLogout';
import { usePaneAdd } from '../../hooks/usePaneAdd';
import { devMode as devModeAtom } from '../../state/dev.atoms';
import { PaneBox } from '../PaneBox';
import { PaneHeaderBox } from '../PaneHeaderBox';
import { EneterSendField } from './EnterSendField';
import { ExpandDiceSwitch } from './ExpandDiceSwitch';
import { LocaleSelect } from './LocaleSelect';
import { ThemeSelect } from './ThemeSelect';

const SectionTitle: FC<ChildrenProps> = ({ children }) => <h3 className="mb-2 font-bold">{children}</h3>;

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
    <label className="flex select-none items-center justify-between gap-4">
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
    <div className="@md:items-center @md:flex-row flex select-none flex-col justify-between gap-4">
      <div className="text-lg">
        {me.user.nickname} <span className="text-sm">({me.user.username})</span>
      </div>
      <div className="flex flex-none gap-2">
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
      <div className="flex min-w-[18rem] max-w-lg flex-col gap-8 p-4">
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
