'use client';

import { post } from '@boluo/api-browser';
import { useQueryCurrentUser } from '@boluo/common';
import Link from 'next/link';
import type { FC } from 'react';
import { FormattedMessage, useIntl } from 'react-intl';
import { Button } from '@boluo/ui/Button';

interface Props {
  spaceId: string;
  token: string;
}

export const AcceptButton: FC<Props> = ({ spaceId, token }) => {
  const { data: currentUser, isLoading } = useQueryCurrentUser();
  const intl = useIntl();
  const handleClick = async () => {
    const result = await post('/spaces/join', { spaceId, token }, {});
    const { space } = result.unwrap();
    window.open(`${process.env.APP_URL}/${intl.locale}/#route=${space.id}`, '_blank');
  };
  const loginLink = (
    <span>
      <Link href="/account/login" className="link">
        <FormattedMessage defaultMessage="log in" />
      </Link>
    </span>
  );
  if (isLoading) {
    return null;
  }
  return (
    <div className="text-right">
      {currentUser == null && (
        <div className="py-2">
          <FormattedMessage defaultMessage="You need to {loginLink} to accept the invitation." values={{ loginLink }} />
        </div>
      )}
      <div>
        <Button data-type="primary" onClick={handleClick} disabled={currentUser == null}>
          <FormattedMessage defaultMessage="Accept" />
        </Button>
      </div>
    </div>
  );
};
