import { LogIn } from '@boluo/icons';
import { type FC } from 'react';
import { FormattedMessage } from 'react-intl';
import { usePaneClose } from '../hooks/usePaneClose';
import { LoginForm } from './account/LoginForm';
import { PaneBox } from './PaneBox';
import { PaneHeaderBox } from './PaneHeaderBox';
import { Todo } from './common/Todo';

export const PaneLogin: FC = () => {
  const close = usePaneClose();
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
        <div>
          <Todo>Sign Up</Todo>
        </div>
      </div>
    </PaneBox>
  );
};

export default PaneLogin;
