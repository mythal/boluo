import { post } from 'api-browser';
import type { FC } from 'react';
import { useState } from 'react';
import { FormattedMessage } from 'react-intl';
import { useSWRConfig } from 'swr';
import { Button } from 'ui/Button';

export const FieldDestroySpace: FC<{ spaceName: string; spaceId: string }> = ({ spaceId, spaceName }) => {
  const { mutate } = useSWRConfig();
  const [isMutating, setIsMutating] = useState(false);
  const deleteSpace = async () => {
    setIsMutating(true);
    const result = await post('/spaces/delete', { id: spaceId }, {});
    setIsMutating(false);
    if (result.isOk) {
      await mutate('/spaces/my');
      // TODO: redirect
    }
  };
  return (
    <div className="flex flex-col gap-1">
      <div>
        <FormattedMessage defaultMessage="Are you sure you want to delete {spaceName}?" values={{ spaceName }} />{' '}
        <span className="font-bold">
          <FormattedMessage defaultMessage="This cannot be undone." />
        </span>
      </div>
      <div className="text-right">
        <Button data-type="danger" type="button" onClick={() => deleteSpace()}>
          <FormattedMessage defaultMessage="Sure, Destroy {spaceName}" values={{ spaceName }} />
        </Button>
      </div>
    </div>
  );
};
