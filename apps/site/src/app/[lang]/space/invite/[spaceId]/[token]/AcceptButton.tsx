'use client';

import { post } from 'api-browser';
import { useMe } from 'common';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import type { FC } from 'react';
import { FormattedMessage } from 'react-intl';
import { Button } from 'ui/Button';
import { Spinner } from 'ui/Spinner';

interface Props {
  spaceId: string;
  token: string;
}

export const AcceptButton: FC<Props> = ({ spaceId, token }) => {
  const router = useRouter();
  const me = useMe();
  const handleClick = async () => {
    const result = await post('/spaces/join', { spaceId, token }, {});
    const { space } = result.unwrap();
    router.push(`/chat/#${space.id}/`);
  };
  const loginLink = (
    <span>
      <Link href="/account/login" className="underline to-blue-600">
        <FormattedMessage defaultMessage="log in" />
      </Link>
    </span>
  );
  return (
    <div>
      <div>
        <Button data-type="primary" onClick={handleClick} disabled={me === 'LOADING' || me == null}>
          <FormattedMessage defaultMessage="Accept" />
        </Button>
        {me === 'LOADING' && (
          <span className="pl-2">
            <Spinner />
          </span>
        )}
      </div>
      {me == null && (
        <div className="py-2">
          <FormattedMessage defaultMessage="You need to {loginLink} to accept the invitation." values={{ loginLink }} />
        </div>
      )}
    </div>
  );
};
