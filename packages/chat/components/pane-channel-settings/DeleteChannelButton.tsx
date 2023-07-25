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

const closePanes = (channelId: string) => (panes: Pane[]): Pane[] =>
  panes.filter((pane) => {
    switch (pane.type) {
      case 'CHANNEL':
      case 'CHANNEL_SETTINGS':
        return pane.channelId !== channelId;
      default:
        return true;
    }
  });

export const DeleteChannelButton: FC<Props> = ({ channelId, channelName }) => {
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
  const [isConfirmOpen, setComfirmOpen] = useState(false);
  const { x, y, strategy, refs, context } = useFloating({
    open: isConfirmOpen,
    strategy: 'fixed',
    placement: 'bottom-start',
    onOpenChange: setComfirmOpen,
    middleware: [offset(8), flip()],
    whileElementsMounted: autoUpdate,
  });

  const click = useClick(context, {});
  const dismiss = useDismiss(context);
  const confirm = useCallback(async () => {
    setComfirmOpen(false);
    await trigger({});
  }, [trigger]);
  const cancel = () => {
    setComfirmOpen(false);
  };
  const { getReferenceProps, getFloatingProps } = useInteractions([
    click,
    dismiss,
  ]);
  return (
    <>
      <Button disabled={isMutating} type="button" ref={refs.setReference} {...getReferenceProps()}>
        {isMutating
          ? <FormattedMessage defaultMessage="Deleting..." />
          : <FormattedMessage defaultMessage="Delete Channel" />}
      </Button>
      {isConfirmOpen && (
        <FloatingPortal>
          <div
            ref={refs.setFloating}
            style={{ position: strategy, top: y ?? 0, left: x ?? 0 }}
            {...getFloatingProps()}
            className="bg-error-50 border w-60 border-error-400 rounded-sm shadow-1 shadow-surface-900/25 py-2 px-4"
          >
            <FormattedMessage
              defaultMessage="Are you sure you want to delete the &quot;{channelName}&quot; channel?"
              values={{ channelName }}
            />
            <div className="flex gap-1 justify-end pt-2">
              <Button type="button" onClick={cancel}>
                <FormattedMessage defaultMessage="Cancel" />
              </Button>
              <Button type="button" data-type="danger" onClick={confirm}>
                <FormattedMessage defaultMessage="Delete" />
              </Button>
            </div>
          </div>
        </FloatingPortal>
      )}
    </>
  );
};
