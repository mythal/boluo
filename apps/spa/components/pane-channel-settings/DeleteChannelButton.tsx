import { type Channel } from '@boluo/api';
import { post } from '@boluo/api-browser';
import { useStore } from 'jotai';
import { type FC, useCallback } from 'react';
import { FormattedMessage } from 'react-intl';
import useSWRMutation from 'swr/mutation';
import type { MutationFetcher } from 'swr/mutation';
import { Button } from '@boluo/ui/Button';
import { type Empty } from '@boluo/types';
import { panesAtom } from '../../state/view.atoms';
import { type Pane } from '../../state/view.types';

interface Props {
  channelId: string;
  channelName: string;
}

const deleteChannel: MutationFetcher<Channel, [string, string], Empty> = async ([_, channelId]) => {
  const result = await post('/channels/delete', { id: channelId }, {});
  return result.unwrap();
};

const closePanes =
  (channelId: string) =>
  (panes: Pane[]): Pane[] =>
    panes.filter((pane) => {
      switch (pane.type) {
        case 'CHANNEL':
        case 'CHANNEL_SETTINGS':
          return pane.channelId !== channelId;
        default:
          return true;
      }
    });

export const DeleteChannel: FC<Props> = ({ channelId, channelName }) => {
  const store = useStore();
  const { trigger } = useSWRMutation<Channel, Empty, [string, string], Empty>(
    ['/channels/query', channelId],
    deleteChannel,
    {
      onSuccess: () => {
        store.set(panesAtom, closePanes(channelId));
      },
    },
  );
  const confirm = useCallback(async () => {
    await trigger({});
  }, [trigger]);
  return (
    <div>
      <FormattedMessage
        defaultMessage='Are you sure you want to delete the "{channelName}" channel?'
        values={{ channelName }}
      />
      <div className="flex justify-end gap-1 pt-3">
        <Button type="button" variant="danger" onClick={confirm}>
          <FormattedMessage defaultMessage="Delete" />
        </Button>
      </div>
    </div>
  );
};
