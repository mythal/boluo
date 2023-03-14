import { Locale, useMe } from 'common';
import { LogOut, Settings, User } from 'icons';
import { useSetAtom } from 'jotai';
import { FC, useTransition } from 'react';
import { useId } from 'react';
import { FormattedMessage } from 'react-intl';
import { Button } from 'ui';
import { Kbd } from 'ui/Kbd';
import { ChildrenProps } from 'utils';
import { useLogout } from '../../hooks/useLogout';
import { useSettings } from '../../hooks/useSettings';
import { useChatPaneDispatch } from '../../state/chat-view';
import { localeAtom } from '../../state/locale';
import { makePane } from '../../types/chat-pane';
import { ClosePaneButton } from '../ClosePaneButton';
import { PaneBodyBox } from '../PaneBodyBox';
import { PaneBox } from '../PaneBox';
import { PaneHeaderBox } from '../PaneHeaderBox';
import { EnterSendSwitch } from './EnterSendSwitch';
import { ExpandDiceSwitch } from './ExpandDiceSwitch';
import { LocaleSelect } from './LocaleSelect';
import { ThemeSelect } from './ThemeSelect';

const SectionTitle: FC<ChildrenProps> = ({ children }) => <h3 className="font-bold mb-2">{children}</h3>;

const LanguageField = () => {
  const id = useId();
  const setLocale = useSetAtom(localeAtom);
  const [disabled, startTransition] = useTransition();
  return (
    <div>
      <label className="block py-1" htmlFor={id}>
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
      <label htmlFor={id} className="block py-1">
        <FormattedMessage defaultMessage="Theme" />
      </label>
      <ThemeSelect id={id} />
    </div>
  );
};

const ExpandDiceField = () => {
  return (
    <label className="flex items-center gap-4 select-none">
      <ExpandDiceSwitch />
      <FormattedMessage defaultMessage="Expand dice in the messages" />
    </label>
  );
};

const EneterSendField = () => {
  const { enterSend = false } = useSettings();
  return (
    <label className="flex items-center gap-4 select-none">
      <EnterSendSwitch />
      <div className="flex flex-col gap-1.5">
        <div>
          <FormattedMessage
            defaultMessage="Use the {enter} key to send messages"
            values={{ enter: <Kbd>Enter</Kbd> }}
          />
        </div>
        <div className="text-neutral-500 text-sm">
          {enterSend
            ? (
              <FormattedMessage
                defaultMessage="Tip: Use {key} to make a line break."
                values={{
                  key: (
                    <>
                      <Kbd>Shift</Kbd> + <Kbd>Enter</Kbd>
                    </>
                  ),
                }}
              />
            )
            : (
              <FormattedMessage
                defaultMessage="Tip: Use {key} to send messages."
                values={{
                  key: (
                    <>
                      <Kbd>Ctrl</Kbd>/<Kbd>⌘</Kbd> + <Kbd>Enter</Kbd>
                    </>
                  ),
                }}
              />
            )}
        </div>
      </div>
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
        <div className="flex flex-col gap-2">
          <SectionTitle>
            <FormattedMessage defaultMessage="Interface" />
          </SectionTitle>
          <LanguageField />
          <ThemeField />
          {me && <ExpandDiceField />}
          {me && <EneterSendField />}
        </div>
        {me && <AccountFields />}
      </PaneBodyBox>
    </PaneBox>
  );
};
