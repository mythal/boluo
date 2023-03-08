import { useMe } from 'common';
import { Settings } from 'icons';
import type { FC } from 'react';
import { useId } from 'react';
import { FormattedMessage } from 'react-intl';
import { Button } from 'ui';
import { Kbd } from 'ui/Kbd';
import { useLogout } from '../../hooks/useLogout';
import { useSettings } from '../../hooks/useSettings';
import { ClosePaneButton } from '../ClosePaneButton';
import { PaneBodyBox } from '../PaneBodyBox';
import { PaneHeaderBox } from '../PaneHeaderBox';
import { EnterSendSwitch } from './EnterSendSwitch';
import { ExpandDiceSwitch } from './ExpandDiceSwitch';
import { LocaleSelect } from './LocaleSelect';
import { ThemeSelect } from './ThemeSelect';

const LanguageField = () => {
  const id = useId();
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
  const logout = useLogout();
  return (
    <div className="flex items-center gap-4 select-none">
      <Button onClick={logout}>
        <FormattedMessage defaultMessage="Logout" />
      </Button>
    </div>
  );
};

const AccountFields = () => {
  const me = useMe();
  if (!me) return null;
  return (
    <div className="flex flex-col gap-4">
      <h3 className="text-xl">
        <FormattedMessage defaultMessage="Account" />
      </h3>

      <LogoutField />
    </div>
  );
};

export const PaneSettings: FC = () => {
  return (
    <>
      <PaneHeaderBox operators={<ClosePaneButton />} icon={<Settings />}>
        <FormattedMessage defaultMessage="Settings" />
      </PaneHeaderBox>
      <PaneBodyBox className="p-4 flex flex-col gap-10 overflow-y-auto">
        <div className="flex flex-col gap-6">
          <h3 className="text-xl">
            <FormattedMessage defaultMessage="Interface" />
          </h3>
          <LanguageField />
          <ThemeField />
          <ExpandDiceField />
          <EneterSendField />
        </div>
        <AccountFields />
      </PaneBodyBox>
    </>
  );
};
