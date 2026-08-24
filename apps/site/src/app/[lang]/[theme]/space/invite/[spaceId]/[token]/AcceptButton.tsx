'use client';

import { post } from '@boluo/api-browser';
import type { ApiError } from '@boluo/api';
import { useQueryAppSettings } from '@boluo/hooks/useQueryAppSettings';
import { useQueryCurrentUser } from '@boluo/hooks/useQueryCurrentUser';
import Link from 'next/link';
import { type FC, useState } from 'react';
import { FormattedMessage, useIntl } from 'react-intl';
import { Button } from '@boluo/ui/Button';
import * as classes from '@boluo/ui/classes';
import { ErrorMessageBox } from '@boluo/ui/ErrorMessageBox';
import { explainError } from '@boluo/locale/errors';
import { reportApiError } from '../../../../../../../error';

interface Props {
  spaceId: string;
  token: string;
}

export const AcceptButton: FC<Props> = ({ spaceId, token }) => {
  const [error, setError] = useState<ApiError | null>(null);
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
    if (result.isErr) {
      reportApiError(result.err, { requestPath: '/spaces/join', source: 'accept-invite' });
      setError(result.err);
      return;
    }
    setError(null);
    const { space } = result.some;
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
      {error && <ErrorMessageBox>{explainError(intl, error)}</ErrorMessageBox>}
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
