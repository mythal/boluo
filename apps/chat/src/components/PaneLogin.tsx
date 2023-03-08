import { LogIn } from 'icons';
import type { FC } from 'react';
import { FormattedMessage } from 'react-intl';
import { useClosePane } from '../state/chat-view';
import { LoginForm } from './account/LoginForm';
import { ClosePaneButton } from './ClosePaneButton';
import { PaneBodyBox } from './PaneBodyBox';
import { PaneHeaderBox } from './PaneHeaderBox';

interface Props {
}

export const PaneLogin: FC<Props> = () => {
  const close = useClosePane();
  return (
    <>
      <PaneHeaderBox operators={<ClosePaneButton />} icon={<LogIn />}>
        <FormattedMessage defaultMessage="Login" />
      </PaneHeaderBox>
      <PaneBodyBox className="p-4">
        <LoginForm onSuccess={close} />
      </PaneBodyBox>
    </>
  );
};
