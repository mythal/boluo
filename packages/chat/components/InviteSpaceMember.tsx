import { get, post } from 'api-browser';
import { Clipboard, Refresh } from 'icons';
import { FC, useCallback, useId, useRef, useState } from 'react';
import { FormattedMessage } from 'react-intl';
import useSWR from 'swr';
import { Button } from 'ui/Button';
import Icon from 'ui/Icon';
import { Loading } from 'ui/Loading';
import { TextInput } from 'ui/TextInput';
import { unwrap } from 'utils';

interface Props {
  spaceId: string;
}

export const InviteSpaceMember: FC<Props> = ({ spaceId }) => {
  const { data: token, mutate } = useSWR(['/spaces/token' as const, spaceId], ([path, id]) =>
    get(path, { id }).then(unwrap),
  );
  const id = useId();
  const inviteLinkRef = useRef<HTMLInputElement>(null);
  const copy = useCallback(() => {
    if (inviteLinkRef.current) {
      inviteLinkRef.current.select();
      document.execCommand('copy');
    }
  }, []);
  const [didRefresh, setDidRefresh] = useState(false);
  const handleRefresh = useCallback(async () => {
    setDidRefresh(true);

    const result = await post('/spaces/refresh_token', { id: spaceId }, {});
    if (result.isOk) {
      const newToken = result.some;
      await mutate(newToken);
    }
  }, [mutate, spaceId]);

  if (!token) {
    return (
      <div className="py-2">
        <Loading />
      </div>
    );
  }

  const link = `${window.location.origin}/space/invite/${spaceId}/${token}`;
  return (
    <div className="flex max-w-lg flex-col gap-4">
      <div>
        <label htmlFor={id + 'link'} className="mb-1 block">
          <FormattedMessage defaultMessage="Invite Link" />
        </label>
        <div className="flex gap-1">
          <TextInput ref={inviteLinkRef} id={id + 'link'} className="w-full flex-1" value={link} readOnly />

          <Button onClick={copy}>
            <Icon icon={Clipboard} />
            <FormattedMessage defaultMessage="Copy" />
          </Button>
          <Button onClick={handleRefresh} disabled={didRefresh}>
            <Icon icon={Refresh} />
            {didRefresh ? (
              <FormattedMessage defaultMessage="Regenerated" />
            ) : (
              <FormattedMessage defaultMessage="Regenerate" />
            )}
          </Button>
        </div>
      </div>
      <div>
        <div>
          <label htmlFor={id + 'find'} className="mb-1 block">
            <FormattedMessage defaultMessage="Find By Name" />
          </label>
          <div>
            <TextInput id={id + 'find'} className="w-full" placeholder="Not Implemented" />
          </div>
        </div>
      </div>
    </div>
  );
};
