import { autoUpdate, useClick, useDismiss, useFloating, useInteractions } from '@floating-ui/react';
import { ApiError, Space, SpaceMemberWithUser } from 'api';
import { post } from 'api-browser';
import { UserPlus, UserX } from 'icons';
import { FC, useState } from 'react';
import { FormattedMessage } from 'react-intl';
import useSWRMutation from 'swr/mutation';
import { Button } from 'ui/Button';
import { unwrap } from 'utils';
import { FloatingBox } from '../common/FloatingBox';
import { SidebarHeaderButton } from '../sidebar/SidebarHeaderButton';

interface Props {
  space: Space;
  mySpaceMember: SpaceMemberWithUser | null;
}

export const SpaceLeaveButton: FC<Props> = ({ space, mySpaceMember }) => {
  const [isConfirmOpen, setComfirmOpen] = useState(false);
  const key = ['/spaces/members', space.id] as const;
  const { trigger: leave, isMutating: isLeaving } = useSWRMutation<true, ApiError, typeof key>(
    key,
    ([_, id]) => post('/spaces/leave', { id }, {}).then(unwrap),
    {
      onSuccess: () => setComfirmOpen(false),
    },
  );
  const { x, y, strategy, refs, context } = useFloating({
    open: isConfirmOpen,
    strategy: 'fixed',
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
      <SidebarHeaderButton
        icon={mySpaceMember == null ? <UserPlus /> : <UserX />}
        isLoading={isLeaving}
        ref={refs.setReference}
        {...getReferenceProps()}
      >
        <span className="">
          {mySpaceMember == null ? (
            <FormattedMessage defaultMessage="Join Space" />
          ) : (
            <FormattedMessage defaultMessage="Leave Space" />
          )}
        </span>
      </SidebarHeaderButton>
      {isConfirmOpen && (
        <div
          style={{ position: strategy, top: y ?? 0, left: x ?? 0 }}
          ref={refs.setFloating}
          {...getFloatingProps()}
          className="w-48"
        >
          <FloatingBox>
            <FormattedMessage
              defaultMessage='Are you sure to leave the "{spaceName}" space?'
              values={{ spaceName: space.name }}
            />
            <div className="pt-2 text-right">
              <Button data-type="danger" type="button" onClick={() => leave()} disabled={isLeaving}>
                <FormattedMessage defaultMessage="Leave" />
              </Button>
            </div>
          </FloatingBox>
        </div>
      )}
    </>
  );
};
