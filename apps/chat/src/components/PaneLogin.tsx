import { ApiError } from 'api';
import { useErrorExplain } from 'common';
import { LogIn } from 'icons';
import { FC, useCallback } from 'react';
import { FormattedMessage, useIntl } from 'react-intl';
import { useSetBanner } from '../hooks/useBanner';
import { useClosePane } from '../state/chat-view';
import { LoginForm } from './account/LoginForm';
import { ClosePaneButton } from './ClosePaneButton';
import { PaneBodyBox } from './PaneBodyBox';
import { PaneBox } from './PaneBox';
import { PaneHeaderBox } from './PaneHeaderBox';

interface Props {
}

export const PaneLogin: FC<Props> = () => {
  const close = useClosePane();
  const setBanner = useSetBanner();
  const intl = useIntl();
  const errorExplain = useErrorExplain();
  const handleError = useCallback((error: ApiError) => {
    const content = error.code === 'NO_PERMISSION'
      ? intl.formatMessage({ defaultMessage: 'Username and password do not match' })
      : errorExplain(error);
    setBanner({ content, level: 'ERROR' });
  }, [errorExplain, intl, setBanner]);
  return (
    <PaneBox>
      <PaneHeaderBox operators={<ClosePaneButton />} icon={<LogIn />}>
        <FormattedMessage defaultMessage="Login" />
      </PaneHeaderBox>
      <PaneBodyBox className="p-4 flex max-w-lg">
        <LoginForm onSuccess={close} onError={handleError} className="w-full" />
      </PaneBodyBox>
    </PaneBox>
  );
};
