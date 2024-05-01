import { get, post } from '@boluo/api-browser';
import { Clipboard, Refresh } from '@boluo/icons';
import { FC, useCallback, useId, useRef, useState } from 'react';
import { FormattedMessage, useIntl } from 'react-intl';
import useSWR from 'swr';
import { Button } from '@boluo/ui/Button';
import Icon from '@boluo/ui/Icon';
import { Loading } from '@boluo/ui/Loading';
import { TextInput } from '@boluo/ui/TextInput';
import { unwrap } from '@boluo/utils';

interface Props {
  spaceId: string;
}

export const InviteSpaceMember: FC<Props> = ({ spaceId }) => {
  const { data: token, mutate } = useSWR(['/spaces/token' as const, spaceId], ([path, id]) =>
    get(path, { id }).then(unwrap),
  );
  const intl = useIntl();
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

  let link;
  if (process.env.SITE_URL) {
    link = `${process.env.SITE_URL}/space/invite/${spaceId}/${token}`;
  } else {
    const base = typeof window !== 'undefined' ? window.location.origin : process.env.APP_URL;
    link = `${base}/${intl.locale}#route=invite?spaceId=${spaceId}&token=${token}`;
  }
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
