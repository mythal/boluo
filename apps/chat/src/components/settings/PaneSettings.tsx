import { useMe } from 'common';
import { LogOut, Settings, User } from 'icons';
import { useSetAtom } from 'jotai';
import { FC, useTransition } from 'react';
import { useId } from 'react';
import { FormattedMessage } from 'react-intl';
import { Button } from 'ui';
import { ChildrenProps } from 'utils';
import { useLogout } from '../../hooks/useLogout';
import { useChatPaneDispatch } from '../../state/chat-view';
import { localeAtom } from '../../state/locale';
import { makePane } from '../../types/chat-pane';
import { ClosePaneButton } from '../ClosePaneButton';
import { PaneBodyBox } from '../PaneBodyBox';
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
  const dispatch = useChatPaneDispatch();
  const logout = useLogout();
  const me = useMe()!;
  const openProfile = () => dispatch({ type: 'ADD_PANE', item: makePane({ type: 'PROFILE', userId: me.user.id }) });
  return (
    <div className="flex justify-between @md:items-center gap-4 select-none flex-col @md:flex-row">
      <div className="text-lg">
        {me.user.nickname} <span className="text-sm">({me.user.username})</span>
      </div>
      <div className="flex gap-2">
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
  return (
    <PaneBox>
      <PaneHeaderBox operators={<ClosePaneButton />} icon={<Settings />}>
        <FormattedMessage defaultMessage="Settings" />
      </PaneHeaderBox>
      <PaneBodyBox className="p-4 flex flex-col gap-8 max-w-lg overflow-y-auto">
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
      </PaneBodyBox>
    </PaneBox>
  );
};
