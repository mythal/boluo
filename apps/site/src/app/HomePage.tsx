'use client';

import type { GetMe, Space } from 'boluo-api';
import type { NextPage } from 'next';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import type { FC } from 'react';
import { useCallback } from 'react';
import { useMemo } from 'react';
import { FormattedMessage } from 'react-intl';
import { useSWRConfig } from 'swr';
import { get } from '../api/browser';
import { Me } from '../components/Me';
import type { StyleProps } from '../helper/props';
import { useMe } from '../hooks/useMe';
import { useMySpaces } from '../hooks/useMySpaces';

const useLogout = () => {
  const router = useRouter();
  const { mutate } = useSWRConfig();

  return useCallback(async () => {
    await get('/users/logout', null);
    await mutate('/users/get_me', null);
    router.refresh();
  }, [router, mutate]);
};

const UserOperations = ({ className }: StyleProps) => {
  const me = useMe();
  const logout = useLogout();
  if (me === null) {
    return (
      <div className={className}>
        <Link className="link" href="/account/login">
          Login
        </Link>
        <Link className="link" href="/account/sign-up">
          Sign Up
        </Link>
      </div>
    );
  }
  return (
    <div className={className}>
      <a className="link" href="#" onClick={logout}>
        Logout
      </a>

      <Link href="/space/create" className="link">
        Create Space
      </Link>
    </div>
  );
};

const MySpaceListItem: FC<{ space: Space }> = ({ space }) => {
  return (
    <div>
      <Link href={`/chat/space/${space.id}`} className="link">
        {space.name}
      </Link>
    </div>
  );
};

const MySpaceList: FC = () => {
  const spaces = useMySpaces();
  const items = useMemo(() => (
    spaces.map(item => <MySpaceListItem key={item.space.id} space={item.space} />)
  ), [spaces]);

  return <div>{items}</div>;
};

const Home: NextPage = () => {
  const me = useMe();
  return (
    <>
      <h1 className="my-4 text-3xl">
        <FormattedMessage defaultMessage="Boluo" />
      </h1>
      <div className="my-8">
        <Me />
        <UserOperations className="flex gap-2" />
      </div>
      {me && <MySpaceList />}
    </>
  );
};

export default Home;
