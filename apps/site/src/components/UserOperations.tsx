'use client';

import { useQueryCurrentUser } from '@boluo/common/hooks';
import Link from 'next/link';
import { FormattedMessage, useIntl } from 'react-intl';
import { useLogout } from '@boluo/common/hooks/useLogout';
import { LoadingText } from '@boluo/ui/LoadingText';
import * as classes from '@boluo/ui/classes';
import { APP_URL } from '../const';
import { useRouter } from 'next/navigation';

export const UserOperations = () => {
  const intl = useIntl();
  const { data: currentUser, isLoading } = useQueryCurrentUser();
  const logout = useLogout();
  const router = useRouter();
  const onClick = () => {
    logout();
    router.refresh();
  };
  if (!APP_URL) {
    return <div>APP_URL is not set.</div>;
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
              <Link className={classes.link} href="/account/sign-up">
                Sign Up
              </Link>
            ),
            login: (
              <Link className={classes.link} href="/account/login">
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
        <FormattedMessage
          defaultMessage="Hi, {username}!"
          values={{ username: currentUser.nickname }}
        />{' '}
        (
        <a href="#" className={classes.link} onClick={logout}>
          <FormattedMessage defaultMessage="Logout" />
        </a>
        )
      </div>
      <div className="text-lg">
        <Link className={classes.link} href={`${APP_URL}/${intl.locale}`} target="_blank">
          Open Boluo
        </Link>
      </div>
    </div>
  );
};
