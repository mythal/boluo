'use client';

import { useQueryCurrentUser, useQueryIsEmailVerified } from '@boluo/common/hooks';
import Link from 'next/link';
import { FormattedMessage, useIntl } from 'react-intl';
import { useLogout } from '@boluo/common/hooks/useLogout';
import { LoadingText } from '@boluo/ui/LoadingText';
import { useQueryAppSettings } from '@boluo/common/hooks';
import * as classes from '@boluo/ui/classes';
import { useRouter } from 'next/navigation';

export const UserOperations = () => {
  const intl = useIntl();
  const { data: currentUser, isLoading } = useQueryCurrentUser();
  const appSettings = useQueryAppSettings();
  const { data: isEmailVerified } = useQueryIsEmailVerified();
  const logout = useLogout();
  const router = useRouter();
  const onClick = () => {
    logout();
    router.refresh();
  };
  if (isLoading || !appSettings.appUrl) {
    return (
      <div>
        <LoadingText />
      </div>
    );
  } else if (!currentUser)
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
        <Link
          className={classes.link}
          href={`${appSettings.appUrl}/${intl.locale}`}
          target="_blank"
        >
          Open Boluo
        </Link>
      </div>
      {isEmailVerified != null && !isEmailVerified && (
        <div className="">
          <FormattedMessage
            defaultMessage="Your email is not verified, please {verifyEmail}."
            values={{
              verifyEmail: (
                <Link className={classes.link} href="/account/verify-email">
                  <FormattedMessage defaultMessage="verify it" />
                </Link>
              ),
            }}
          />
        </div>
      )}
    </div>
  );
};
