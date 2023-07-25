import { autoUpdate, FloatingPortal, useClick, useDismiss, useFloating, useInteractions } from '@floating-ui/react';
import { GetMe } from 'api';
import { post } from 'api-browser';
import { UserX } from 'icons';
import { FC, useCallback, useState } from 'react';
import { FormattedMessage } from 'react-intl';
import useSWRMutation, { MutationFetcher } from 'swr/mutation';
import { Button } from 'ui/Button';
import { Spinner } from 'ui/Spinner';
import { Empty } from 'utils';
import { useChannel } from '../../hooks/useChannel';
import { useMyChannelMember } from '../../hooks/useMyChannelMember';

interface Props {
  channelId: string;
  me: GetMe;
  onSuccess?: () => void;
}

const leave: MutationFetcher<void, [string, string], Empty> = async ([_, channelId]) => {
  await post('/channels/leave', { id: channelId }, {});
};

export const MemberLeaveButton: FC<Props> = ({ channelId, onSuccess, me }) => {
  const channelMember = useMyChannelMember(channelId);
  const channel = useChannel(channelId);
  const { trigger, isMutating } = useSWRMutation(['/channels/members', channelId], leave, { onSuccess });

  const [isConfirmOpen, setComfirmOpen] = useState(false);
  const { x, y, strategy, refs, context } = useFloating({
    open: isConfirmOpen,
    strategy: 'fixed',
    placement: 'bottom-start',
    onOpenChange: setComfirmOpen,
    whileElementsMounted: autoUpdate,
  });

  const click = useClick(context, {});
  const dismiss = useDismiss(context);
  const confirm = useCallback(async () => {
    setComfirmOpen(false);
    await trigger({});
  }, [trigger]);
  const { getReferenceProps, getFloatingProps } = useInteractions([
    click,
    dismiss,
  ]);
  return (
    <>
      <Button data-small ref={refs.setReference} disabled={!channelMember || isMutating} {...getReferenceProps()}>
        {isMutating ? <Spinner /> : <UserX />}
        <FormattedMessage defaultMessage="Leave" />
      </Button>
      {isConfirmOpen && (
        <FloatingPortal>
          <div
            className="bg-surface-100 border border-surface-400 rounded-sm shadow-1 shadow-surface-900/25 py-2 px-4"
            ref={refs.setFloating}
            style={{ position: strategy, top: y ?? 0, left: x ?? 0 }}
            {...getFloatingProps()}
          >
            <div>
              <FormattedMessage
                defaultMessage="Are you sure you want to leave {channelName}?"
                values={{ channelName: channel?.name }}
              />
            </div>
            <div className="text-right pt-2">
              <Button data-type="danger" data-small onClick={confirm}>
                <FormattedMessage defaultMessage="Leave" />
              </Button>
            </div>
          </div>
        </FloatingPortal>
      )}
    </>
  );
};
