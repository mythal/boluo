import { User } from '@boluo/api';
import { Metadata } from 'next';
import { notFound } from 'next/navigation';
import React from 'react';
import { get } from '@boluo/common/server/api';
import { getIntl, LangParams } from '@boluo/common/server';
import { BackLink } from '../../../../components/BackLink';

interface Params extends LangParams {
  userId: string;
}

const getUser = React.cache(async (userId: string): Promise<User | null> => {
  const result = await get('/users/query', { id: userId });
  if (result.isOk) {
    return result.some;
  }
  const error = result.err;
  if (error.code === 'NOT_FOUND') return null;
  return result.unwrap();
});

export async function generateMetadata({ params }: { params: Params }): Promise<Metadata> {
  const intl = getIntl(params);
  const user = await getUser(params.userId);
  if (!user) {
    return {
      title: intl.formatMessage({ defaultMessage: 'Person not found' }),
    };
  }

  return {
    title: user.nickname,
  };
}

export default async function Page({ params: { userId } }: { params: Params }) {
  const user = await getUser(userId);
  if (!user) {
    return notFound();
  }
  return (
    <div className="bg-card-bg border-card-border shadow-1/2 shadow-card-shadow max-w-md rounded-sm border p-4">
      <div>
        <BackLink />
      </div>
      <div className="text-center text-xl">{user.nickname}</div>
      {user.bio !== '' && <div className="max-w-md whitespace-pre-line py-4">{user.bio}</div>}
    </div>
  );
}
