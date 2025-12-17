'use client';

import { post } from '@boluo/api-browser';
import { useQueryAppSettings } from '@boluo/hooks/useQueryAppSettings';
import { useQueryCurrentUser } from '@boluo/hooks/useQueryCurrentUser';
import Link from 'next/link';
import type { FC } from 'react';
import { FormattedMessage, useIntl } from 'react-intl';
import { Button } from '@boluo/ui/Button';
import * as classes from '@boluo/ui/classes';

interface Props {
  spaceId: string;
  token: string;
}

export const AcceptButton: FC<Props> = ({ spaceId, token }) => {
  const { data: currentUser, isLoading } = useQueryCurrentUser();
  const intl = useIntl();
  const { data: appSettings, isLoading: isLoadingAppSettings } = useQueryAppSettings();
  const handleClick = async () => {
    const appUrl = appSettings?.appUrl;
    if (!appUrl) {
      alert('APP_URL is not set.');
      return;
    }
    const result = await post('/spaces/join', { spaceId, token }, {});
    const { space } = result.unwrap();
    window.open(`${appUrl}/${intl.locale}/#route=${space.id}`, '_blank');
  };
  const loginLink = (
    <span>
      <Link href="/account/login" className={classes.link}>
        <FormattedMessage defaultMessage="log in" />
      </Link>
    </span>
  );
  if (isLoading || isLoadingAppSettings) {
    return null;
  }
  return (
    <div className="text-right">
      {currentUser == null && (
        <div className="py-2">
          <FormattedMessage
            defaultMessage="You need to {loginLink} to accept the invitation."
            values={{ loginLink }}
          />
        </div>
      )}
      <div>
        <Button variant="primary" onClick={handleClick} disabled={currentUser == null}>
          <FormattedMessage defaultMessage="Accept" />
        </Button>
      </div>
    </div>
  );
};
