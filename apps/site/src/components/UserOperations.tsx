'use client';

import { useQueryCurrentUser } from '@boluo/hooks/useQueryCurrentUser';
import { useQueryIsEmailVerified } from '@boluo/hooks/useQueryIsEmailVerified';
import Link from 'next/link';
import { FormattedMessage, useIntl } from 'react-intl';
import { useLogout } from '@boluo/hooks/useLogout';
import { LoadingText } from '@boluo/ui/LoadingText';
import { useQueryAppSettings } from '@boluo/hooks/useQueryAppSettings';
import * as classes from '@boluo/ui/classes';
import type { User } from '@boluo/api';

const LoggedIn = ({
  currentUser,
  appUrl,
  className,
}: {
  currentUser: User;
  appUrl: string;
  className?: string;
}) => {
  const intl = useIntl();
  const { data: isEmailVerified } = useQueryIsEmailVerified();
  const logout = useLogout();
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
        <Link className={classes.link} href={`${appUrl}/${intl.locale}`} target="_blank">
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

export const UserOperations = ({ className }: { className?: string }) => {
  const { data: currentUser, isLoading } = useQueryCurrentUser();
  const { data: appSettings, isLoading: isLoadingAppSettings } = useQueryAppSettings();
  if (isLoading || isLoadingAppSettings || !appSettings?.appUrl) {
    return (
      <div className={className}>
        <LoadingText />
      </div>
    );
  } else if (!currentUser) {
    return (
      <div className={className}>
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
  }
  return <LoggedIn currentUser={currentUser} appUrl={appSettings.appUrl} />;
};
