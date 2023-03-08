import { LogIn } from 'icons';
import type { FC } from 'react';
import { FormattedMessage } from 'react-intl';
import { LoginForm } from './account/LoginForm';
import { ClosePaneButton } from './ClosePaneButton';
import { PaneBodyBox } from './PaneBodyBox';
import { PaneHeaderBox } from './PaneHeaderBox';

interface Props {
}

export const PaneLogin: FC<Props> = () => {
  return (
    <>
      <PaneHeaderBox operators={<ClosePaneButton />} icon={<LogIn />}>
        <FormattedMessage defaultMessage="Login" />
      </PaneHeaderBox>
      <PaneBodyBox className="p-4">
        <LoginForm />
      </PaneBodyBox>
    </>
  );
};
