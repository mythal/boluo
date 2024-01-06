import {
  autoUpdate,
  flip,
  FloatingPortal,
  offset,
  shift,
  useClick,
  useDismiss,
  useFloating,
  useInteractions,
} from '@floating-ui/react';
import { Channel } from 'api';
import { post } from 'api-browser';
import { useStore } from 'jotai';
import { FC, useCallback, useState } from 'react';
import { FormattedMessage } from 'react-intl';
import useSWRMutation from 'swr/mutation';
import type { MutationFetcher } from 'swr/mutation';
import { Button } from 'ui/Button';
import { Empty } from 'utils';
import { panesAtom } from '../../state/view.atoms';
import { Pane } from '../../state/view.types';

interface Props {
  channelId: string;
  channelName: string;
}

const deleteChannel: MutationFetcher<Channel, Empty, [string, string]> = async ([_, channelId]) => {
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
  const { trigger, isMutating } = useSWRMutation<Channel, Empty, [string, string], Empty>(
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
      <div className="flex gap-1 justify-end pt-3">
        <Button type="button" data-type="danger" onClick={confirm}>
          <FormattedMessage defaultMessage="Delete" />
        </Button>
      </div>
    </div>
  );
};
