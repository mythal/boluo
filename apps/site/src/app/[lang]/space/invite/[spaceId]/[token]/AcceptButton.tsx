'use client';

import { post } from 'api-browser';
import { useRouter } from 'next/navigation';
import type { FC } from 'react';
import { FormattedMessage } from 'react-intl';
import { Button } from 'ui/Button';

interface Props {
  spaceId: string;
  token: string;
}

export const AcceptButton: FC<Props> = ({ spaceId, token }) => {
  const router = useRouter();
  const handleClick = async () => {
    const result = await post('/spaces/join', { spaceId, token }, {});
    const { space } = result.unwrap();
    router.push(`/chat/#${space.id}/`);
  };
  return (
    <Button data-type="primary" onClick={handleClick}>
      <FormattedMessage defaultMessage="Accept" />
    </Button>
  );
};
