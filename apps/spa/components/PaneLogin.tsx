import LogIn from '@boluo/icons/LogIn';
import { type FC, type MouseEventHandler, useCallback } from 'react';
import { FormattedMessage } from 'react-intl';
import { usePaneClose } from '../hooks/usePaneClose';
import { usePaneReplace } from '../hooks/usePaneReplace';
import { LoginForm } from './account/LoginForm';
import { PaneBox } from './PaneBox';
import { PaneHeaderBox } from './PaneHeaderBox';
import { paneHref } from '../href';
import * as classes from '@boluo/ui/classes';

const signUpPaneHref = paneHref({ type: 'SIGN_UP' });

const resetPasswordPaneHref = paneHref({ type: 'RESET_PASSWORD' });

export const PaneLogin: FC = () => {
  const close = usePaneClose();
  const replacePane = usePaneReplace();
  const handleForgotPassword: MouseEventHandler<HTMLAnchorElement> = useCallback(
    (event) => {
      event.preventDefault();
      replacePane({ type: 'RESET_PASSWORD' }, (pane) => pane.type === 'LOGIN');
    },
    [replacePane],
  );
  const handleOpenSignUp: MouseEventHandler<HTMLAnchorElement> = useCallback(
    (event) => {
      event.preventDefault();
      replacePane({ type: 'SIGN_UP' }, (pane) => pane.type === 'LOGIN');
    },
    [replacePane],
  );
  return (
    <PaneBox
      header={
        <PaneHeaderBox icon={<LogIn />}>
          <FormattedMessage defaultMessage="Login" />
        </PaneHeaderBox>
      }
    >
      <div className="p-pane max-w-lg">
        <LoginForm onSuccess={close} className="w-full" />
        <div className="mt-3 flex justify-between">
          <a href={signUpPaneHref} className={classes.link} onClick={handleOpenSignUp}>
            <FormattedMessage defaultMessage="Sign Up" />
          </a>
          <a href={resetPasswordPaneHref} className={classes.link} onClick={handleForgotPassword}>
            <FormattedMessage defaultMessage="Forgot password?" />
          </a>
        </div>
      </div>
    </PaneBox>
  );
};

export default PaneLogin;
