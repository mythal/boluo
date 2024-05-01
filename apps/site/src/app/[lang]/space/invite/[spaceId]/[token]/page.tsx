import { ApiError, Space } from '@boluo/api';
import { Metadata } from 'next';
import { notFound } from 'next/navigation';
import React from 'react';
import { Result } from '@boluo/utils';
import { get } from '@boluo/common/server/api';
import { getIntl, LangParams } from '@boluo/common/server';
import { AcceptButton } from './AcceptButton';
import { BackLink } from '../../../../../../components/BackLink';
import { Oops } from '@boluo/ui/Oops';

interface Params extends LangParams {
  spaceId: string;
  token: string;
}

interface Props {
  params: Params;
}

const getSpace = React.cache(async (spaceId: string, token?: string): Promise<Result<Space | null, ApiError>> => {
  return await get('/spaces/query', { id: spaceId, token });
});

export async function generateMetadata({ params }: { params: Params }): Promise<Metadata> {
  const intl = getIntl(params);
  const spaceResult = await getSpace(params.spaceId);
  if (spaceResult.isErr || spaceResult.some == null) {
    return {
      title: intl.formatMessage({ defaultMessage: 'Space not found' }),
    };
  }
  const space = spaceResult.some;

  return {
    title: intl.formatMessage({ defaultMessage: 'You have been invited to "{spaceName}"' }, { spaceName: space.name }),
  };
}

export default async function Page({ params: { spaceId, token, lang } }: Props) {
  const intl = getIntl({ lang });
  const spaceResult = await getSpace(spaceId, token);
  if (spaceResult.isErr) {
    const { err } = spaceResult;
    if (err.code === 'NOT_FOUND') {
      return notFound();
    } else if (err.code === 'NO_PERMISSION') {
      const invaild = intl.formatMessage({ defaultMessage: 'Invalid invitation link' });
      return <div className="p-4">{invaild}</div>;
    } else if (err.code === 'FETCH_FAIL') {
      console.warn(err.cause);
      throw err.cause;
    }
    return spaceResult.unwrap();
  }
  const space = spaceResult.some;
  if (space == null) {
    return notFound();
  }
  const title = intl.formatMessage(
    { defaultMessage: 'You have been invited to the space' },
    {
      spaceName: space.name,
    },
  );
  return (
    <div className="mx-auto p-4 md:container md:p-8">
      <div className="bg-card-bg border-card-border shadow-1/2 shadow-card-shadow max-w-md rounded-sm border p-4">
        <div className="py-2 italic">{title}</div>
        <div className="py-4 text-center text-xl font-bold">{space.name}</div>
        {space.description !== '' && <div className="max-w-md whitespace-pre-line py-4">{space.description}</div>}
        <div className="mt-8 flex items-end justify-between">
          <BackLink />
          <AcceptButton spaceId={spaceId} token={token} />
        </div>
      </div>
    </div>
  );
}
