'use client';

import { get } from '@boluo/api-browser';
import { useQueryUser } from '@boluo/common';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useCallback } from 'react';
import { FormattedMessage, useIntl } from 'react-intl';
import { useSWRConfig } from 'swr';

const useLogout = () => {
  const router = useRouter();
  const { mutate } = useSWRConfig();

  return useCallback(async () => {
    await get('/users/logout', null);
    await mutate(['/users/query'], null);
    router.refresh();
  }, [mutate, router]);
};

export const UserOperations = () => {
  const intl = useIntl();
  const { data: currentUser, isLoading } = useQueryUser();
  const logout = useLogout();
  const appUrl = process.env.APP_URL || '';
  if (!appUrl) {
    alert('Please set the APP_URL environment variable.');
    return null;
  }
  if (isLoading) return <div>Loading...</div>;
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
