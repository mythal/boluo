'use client';

import { useQueryCurrentUser } from '@boluo/common';
import Link from 'next/link';
import { FormattedMessage, useIntl } from 'react-intl';
import { useLogout } from '../hooks/useLogout';
import { LoadingText } from '@boluo/ui/LoadingText';

export const UserOperations = () => {
  const intl = useIntl();
  const { data: currentUser, isLoading } = useQueryCurrentUser();
  const logout = useLogout();
  const appUrl = process.env.APP_URL || '';
  if (!appUrl) {
    alert('Please set the APP_URL environment variable.');
    return null;
  }
  if (isLoading)
    return (
      <div>
        <LoadingText />
      </div>
    );
  if (!currentUser)
    return (
      <div>
        <FormattedMessage
          defaultMessage="You are not logged in, {signUp} or {login}."
          values={{
            signUp: (
              <Link className="link" href="/account/sign-up">
                Sign Up
              </Link>
            ),
            login: (
              <Link className="link" href="/account/login">
                Login
              </Link>
            ),
          }}
        />
      </div>
    );
  return (
    <div className="flex flex-col gap-4">
      <div>
        <FormattedMessage defaultMessage="Hi, {username}!" values={{ username: currentUser.nickname }} /> (
        <a href="#" className="link" onClick={logout}>
          <FormattedMessage defaultMessage="Logout" />
        </a>
        )
      </div>
      <div>
        <Link className="link text-lg" href={`${appUrl}/${intl.locale}`} target="_blank">
          Open Boluo
        </Link>
      </div>
    </div>
  );
};
