import { autoUpdate, FloatingPortal, useClick, useDismiss, useFloating, useInteractions } from '@floating-ui/react';
import { post } from '@boluo/api-browser';
import { UserX } from '@boluo/icons';
import { FC, useCallback, useState } from 'react';
import { FormattedMessage } from 'react-intl';
import useSWRMutation, { MutationFetcher } from 'swr/mutation';
import { Button } from '@boluo/ui/Button';
import { Spinner } from '@boluo/ui/Spinner';
import { Empty } from '@boluo/utils';
import { useMyChannelMember } from '../../hooks/useMyChannelMember';
import { useQueryChannel } from '../../hooks/useQueryChannel';
import { FloatingBox } from '../common/FloatingBox';
import { SidebarHeaderButton } from '../sidebar/SidebarHeaderButton';
import Icon from '@boluo/ui/Icon';

interface Props {
  channelId: string;
  onSuccess?: () => void;
}

const leave: MutationFetcher<void, [string, string], Empty> = async ([_, channelId]) => {
  await post('/channels/leave', { id: channelId }, {});
};

export const MemberLeaveButton: FC<Props> = ({ channelId, onSuccess }) => {
  const channelMember = useMyChannelMember(channelId);
  const { data: channel, isLoading } = useQueryChannel(channelId);
  const { trigger, isMutating } = useSWRMutation(['/channels/members', channelId], leave, { onSuccess });

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
      <SidebarHeaderButton
        ref={refs.setReference}
        disabled={channelMember.isErr || isMutating || isLoading}
        size="small"
        {...getReferenceProps()}
      >
        {isMutating || isLoading ? <Spinner /> : <Icon icon={UserX} />}
        <FormattedMessage defaultMessage="Leave" />
      </SidebarHeaderButton>
      {isConfirmOpen && (
        <FloatingPortal>
          <div
            ref={refs.setFloating}
            style={{ position: strategy, top: y ?? 0, left: x ?? 0, zIndex: 30 }}
            {...getFloatingProps()}
          >
            <FloatingBox>
              <div className="max-w-xs">
                <FormattedMessage
                  defaultMessage="Are you sure you want to leave {channelName}?"
                  values={{ channelName: channel?.name }}
                />
              </div>
              <div className="pt-2 text-right">
                <Button data-type="danger" data-small onClick={confirm} disabled={channel == null}>
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
