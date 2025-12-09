import {
  autoUpdate,
  FloatingPortal,
  useClick,
  useDismiss,
  useFloating,
  useInteractions,
} from '@floating-ui/react';
import { post } from '@boluo/api-browser';
import { UserX } from '@boluo/icons';
import { type FC, useCallback, useState, useMemo } from 'react';
import { FormattedMessage } from 'react-intl';
import useSWRMutation, { type MutationFetcher } from 'swr/mutation';
import { Button } from '@boluo/ui/Button';
import { Spinner } from '@boluo/ui/Spinner';
import { type Empty } from '@boluo/types';
import { useQueryChannel } from '../../hooks/useQueryChannel';
import { FloatingBox } from '@boluo/ui/FloatingBox';
import { PaneHeaderButton } from '@boluo/ui/PaneHeaderButton';
import Icon from '@boluo/ui/Icon';
import { useQueryChannelMembers } from '../../hooks/useQueryChannelMembers';
import { type MemberWithUser } from '@boluo/api';
import { useMember } from '../../hooks/useMember';

interface Props {
  channelId: string;
  onSuccess?: () => void;
}

const leave: MutationFetcher<void, [string, string], Empty> = async ([_, channelId]) => {
  await post('/channels/leave', { id: channelId }, {});
};

export const MemberLeaveButton: FC<Props> = ({ channelId, onSuccess }) => {
  const { data: channel, isLoading } = useQueryChannel(channelId);
  const { trigger, isMutating } = useSWRMutation(['/channels/members', channelId], leave, {
    onSuccess,
  });
  const myMember = useMember();
  const [isConfirmOpen, setComfirmOpen] = useState(false);
  const { x, y, strategy, refs, context } = useFloating({
    open: isConfirmOpen,
    strategy: 'fixed',
    placement: 'bottom-end',
    onOpenChange: setComfirmOpen,
    whileElementsMounted: autoUpdate,
  });

  const click = useClick(context, {});
  const dismiss = useDismiss(context);
  const confirm = useCallback(async () => {
    setComfirmOpen(false);
    await trigger({});
  }, [trigger]);
  const { getReferenceProps, getFloatingProps } = useInteractions([click, dismiss]);
  return (
    <>
      <PaneHeaderButton
        ref={refs.setReference}
        disabled={myMember == null || isMutating || isLoading}
        {...getReferenceProps()}
      >
        {isMutating || isLoading ? <Spinner /> : <Icon icon={UserX} />}
        <FormattedMessage defaultMessage="Leave" />
      </PaneHeaderButton>
      {isConfirmOpen && (
        <FloatingPortal>
          <div
            ref={refs.setFloating}
            style={{ position: strategy, top: y ?? 0, left: x ?? 0, zIndex: 30 }}
            {...getFloatingProps()}
          >
            <FloatingBox className="p-3">
              <div className="max-w-xs">
                <FormattedMessage
                  defaultMessage="Are you sure you want to leave {channelName}?"
                  values={{ channelName: channel?.name }}
                />
              </div>
              <div className="pt-2 text-right">
                <Button variant="danger" small onClick={confirm} disabled={channel == null}>
                  <FormattedMessage defaultMessage="Leave" />
                </Button>
              </div>
            </FloatingBox>
          </div>
        </FloatingPortal>
      )}
    </>
  );
};
