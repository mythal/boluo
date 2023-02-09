import clsx from 'clsx';
import { useRouter } from 'next/navigation';
import type { FC } from 'react';
import { useState } from 'react';
import { FormattedMessage } from 'react-intl';
import { useSWRConfig } from 'swr';
import { Button } from 'ui';
import { post } from '../../../api/browser';

export const FieldDestroySpace: FC<{ spaceName: string; spaceId: string }> = ({ spaceId, spaceName }) => {
  const { mutate } = useSWRConfig();
  const router = useRouter();
  const [isShowConfirm, setShowConfirm] = useState(false);
  const [isMutating, setIsMutating] = useState(false);
  const deleteSpace = async () => {
    setIsMutating(true);
    const result = await post('/spaces/delete', { id: spaceId }, {});
    setIsMutating(false);
    if (result.isOk) {
      await mutate('/spaces/my');
      router.push('/', {});
    }
  };
  if (!isShowConfirm) {
    return (
      <div>
        <Button data-type="danger" type="button" onClick={() => setShowConfirm(true)}>
          <FormattedMessage defaultMessage="Destroy Space" />
        </Button>
      </div>
    );
  }
  return (
    <div className="flex flex-col gap-1">
      <div>
        <FormattedMessage
          defaultMessage="Are you sure you want to delete {spaceName}?"
          values={{ spaceName }}
        />{' '}
        <span className="font-bold">
          <FormattedMessage defaultMessage="This cannot be undone." />
        </span>
      </div>
      <div className="flex gap-2 danger-fade-in">
        <Button className="flex-shrink-0" type="button" onClick={() => setShowConfirm(false)}>
          <FormattedMessage defaultMessage="Cancel" />
        </Button>
        <Button data-type="danger" type="button" onClick={() => deleteSpace()}>
          <FormattedMessage defaultMessage="Sure, Destroy {spaceName}" values={{ spaceName }} />
        </Button>
      </div>
    </div>
  );
};
