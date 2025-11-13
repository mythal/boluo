import { LogIn } from '@boluo/icons';
import { type FC, useCallback } from 'react';
import { FormattedMessage } from 'react-intl';
import { usePaneClose } from '../hooks/usePaneClose';
import { usePaneReplace } from '../hooks/usePaneReplace';
import { LoginForm } from './account/LoginForm';
import { PaneBox } from './PaneBox';
import { PaneHeaderBox } from './PaneHeaderBox';
import * as classes from '@boluo/ui/classes';

export const PaneLogin: FC = () => {
  const close = usePaneClose();
  const replacePane = usePaneReplace();
  const handleForgotPassword = useCallback(() => {
    replacePane({ type: 'RESET_PASSWORD' }, (pane) => pane.type === 'LOGIN');
  }, [replacePane]);
  const handleOpenSignUp = useCallback(() => {
    replacePane({ type: 'SIGN_UP' }, (pane) => pane.type === 'LOGIN');
  }, [replacePane]);
  return (
    <PaneBox
      header={
        <PaneHeaderBox icon={<LogIn />}>
          <FormattedMessage defaultMessage="Login" />
        </PaneHeaderBox>
      }
    >
      <div className="p-pane">
        <LoginForm onSuccess={close} className="w-full" />
        <div className="mt-3 flex justify-between">
          <button type="button" className={classes.link} onClick={handleOpenSignUp}>
            <FormattedMessage defaultMessage="Sign Up" />
          </button>
          <button type="button" className={classes.link} onClick={handleForgotPassword}>
            <FormattedMessage defaultMessage="Forgot password?" />
          </button>
        </div>
      </div>
    </PaneBox>
  );
};

export default PaneLogin;
