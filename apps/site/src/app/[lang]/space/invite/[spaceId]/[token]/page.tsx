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

const getSpace = React.cache(async (spaceId: string, token?: string): Promise<Result<Space | null, ApiError>> => {
  return await get('/spaces/query', { id: spaceId, token });
});

export async function generateMetadata(
  { params }: { params: Params },
): Promise<Metadata> {
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
      return (
        <div className="p-4">
          {invaild}
        </div>
      );
    }
    return <div>Unknown Error</div>;
  }
  const space = spaceResult.some;
  if (space == null) {
    return notFound();
  }
  const title = intl.formatMessage({ defaultMessage: 'You have been invited to "{spaceName}".' }, {
    spaceName: space.name,
  });
  return (
    <div className="p-4">
      <div className="text-xl font-bold">
        {space.name}
      </div>
      <div className="py-2">
        {title}
      </div>
      {space.description !== '' && <div className="py-4 max-w-md whitespace-pre-line">{space.description}</div>}
      <div className="mt-4 space-x-2">
        <AcceptButton spaceId={spaceId} token={token} />
      </div>
    </div>
  );
}
