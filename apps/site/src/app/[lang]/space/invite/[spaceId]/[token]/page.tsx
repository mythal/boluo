import { ApiError, Space } from 'api';
import { Metadata } from 'next';
import { notFound } from 'next/navigation';
import React from 'react';
import { Result } from 'utils';
import { get } from '../../../../../../api/server';
import { getIntl, LangParams } from '../../../../../../server';
import { AcceptButton } from './AcceptButton';

interface Params extends LangParams {
  spaceId: string;
  token: string;
}

interface Props {
  params: Params;
}

const getSpace = React.cache(async (spaceId: string): Promise<Space | null> => {
  const result = await get('/spaces/query', { id: spaceId });
  if (result.isOk) {
    return result.some;
  }
  const error = result.err;
  if (error.code === 'NOT_FOUND') return null;
  return result.unwrap();
});

export async function generateMetadata(
  { params }: { params: Params },
): Promise<Metadata> {
  const intl = getIntl(params);
  const space = await getSpace(params.spaceId);
  if (!space) {
    return {
      title: intl.formatMessage({ defaultMessage: 'Space not found' }),
    };
  }

  return {
    title: intl.formatMessage({ defaultMessage: 'You have been invited to "{spaceName}"' }, { spaceName: space.name }),
  };
}

export default async function Page({ params: { spaceId, token } }: Props) {
  const space = await getSpace(spaceId);
  if (!space) {
    return notFound();
  }
  return (
    <div className="p-4">
      <div className="text-xl">
        You have been invited to <span className="font-bold">{space.name}</span>
      </div>
      <div className="mt-4 space-x-2">
        <AcceptButton spaceId={spaceId} token={token} />
      </div>
    </div>
  );
}
