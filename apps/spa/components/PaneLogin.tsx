import { type ApiError } from '@boluo/api';
import { useErrorExplain } from '@boluo/common/hooks/useErrorExplain';
import { LogIn } from '@boluo/icons';
import { type FC, useCallback } from 'react';
import { FormattedMessage, useIntl } from 'react-intl';
import { useSetBanner } from '../hooks/useBanner';
import { usePaneClose } from '../hooks/usePaneClose';
import { LoginForm } from './account/LoginForm';
import { PaneBox } from './PaneBox';
import { PaneHeaderBox } from './PaneHeaderBox';
import { Todo } from './common/Todo';

export const PaneLogin: FC = () => {
  const close = usePaneClose();
  const setBanner = useSetBanner();
  const intl = useIntl();
  const errorExplain = useErrorExplain();
  const handleError = useCallback(
    (error: ApiError) => {
      const content =
        error.code === 'NO_PERMISSION'
          ? intl.formatMessage({ defaultMessage: 'Username and password do not match' })
          : errorExplain(error);
      setBanner({ content, level: 'ERROR' });
    },
    [errorExplain, intl, setBanner],
  );
  return (
    <PaneBox
      header={
        <PaneHeaderBox icon={<LogIn />}>
          <FormattedMessage defaultMessage="Login" />
        </PaneHeaderBox>
      }
    >
      <div className="p-pane">
        <LoginForm onSuccess={close} onError={handleError} className="w-full" />
        <div>
          <Todo>Sign Up</Todo>
        </div>
      </div>
    </PaneBox>
  );
};

export default PaneLogin;
