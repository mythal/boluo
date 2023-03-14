'use client';

import { usePost } from 'common';
import { useRouter } from 'next/navigation';
import type { FC } from 'react';
import { FormattedMessage } from 'react-intl';
import { Button } from 'ui';

interface Props {
  spaceId: string;
  token: string;
}

export const AcceptButton: FC<Props> = ({ spaceId, token }) => {
  const router = useRouter();
  const post = usePost();
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
