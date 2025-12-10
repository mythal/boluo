import {
  autoUpdate,
  FloatingPortal,
  useClick,
  useDismiss,
  useFloating,
  useInteractions,
} from '@floating-ui/react';
import { type ApiError, type Space, type SpaceMemberWithUser } from '@boluo/api';
import { post } from '@boluo/api-browser';
import { UserPlus, UserX } from '@boluo/icons';
import { type FC, useState } from 'react';
import { FormattedMessage } from 'react-intl';
import useSWRMutation from 'swr/mutation';
import { Button } from '@boluo/ui/Button';
import { unwrap } from '@boluo/utils/result';
import { FloatingBox } from '@boluo/ui/FloatingBox';
import { PaneHeaderButton } from '@boluo/ui/PaneHeaderButton';
import { useSWRConfig } from 'swr';

interface Props {
  space: Space;
  mySpaceMember: SpaceMemberWithUser | null;
}

export const SpaceLeaveButton: FC<Props> = ({ space, mySpaceMember }) => {
  const { mutate } = useSWRConfig();
  const [isConfirmOpen, setComfirmOpen] = useState(false);
  const key = ['/spaces/my_space_member', space.id] as const;
  const { trigger: leave, isMutating: isLeaving } = useSWRMutation<true, ApiError, typeof key>(
    key,
    ([_, id]) => post('/spaces/leave', { id }, {}).then(unwrap),
    {
      onSuccess: () => {
        void mutate(['/spaces/members', space.id]);
        setComfirmOpen(false);
      },
    },
  );
  const { refs, context, floatingStyles } = useFloating({
    open: isConfirmOpen,
    placement: 'bottom-end',
    onOpenChange: setComfirmOpen,
    whileElementsMounted: autoUpdate,
  });

  const click = useClick(context, {
    enabled: mySpaceMember != null,
  });
  const dismiss = useDismiss(context);

  const { getReferenceProps, getFloatingProps } = useInteractions([click, dismiss]);
  return (
    <>
      <PaneHeaderButton
        icon={mySpaceMember == null ? <UserPlus /> : <UserX />}
        isLoading={isLeaving}
        ref={refs.setReference}
        {...getReferenceProps()}
      >
        <span className="text-xs">
          {mySpaceMember == null ? (
            <FormattedMessage defaultMessage="Join Space" />
          ) : (
            <FormattedMessage defaultMessage="Leave Space" />
          )}
        </span>
      </PaneHeaderButton>
      {isConfirmOpen && (
        <FloatingPortal>
          <div
            style={floatingStyles}
            ref={refs.setFloating}
            {...getFloatingProps()}
            className="w-54"
          >
            <FloatingBox className="p-3">
              <FormattedMessage
                defaultMessage='Are you sure to leave the "{spaceName}" space?'
                values={{ spaceName: space.name }}
              />
              <div className="pt-2 text-right">
                <Button
                  variant="danger"
                  type="button"
                  onClick={() => void leave()}
                  disabled={isLeaving}
                >
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
