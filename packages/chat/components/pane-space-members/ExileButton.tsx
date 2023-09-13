import { autoUpdate, FloatingPortal, useClick, useDismiss, useFloating, useInteractions } from '@floating-ui/react';
import { post } from 'api-browser';
import { UserX } from 'icons';
import { FC, useState } from 'react';
import { FormattedMessage } from 'react-intl';
import useSWRMutation from 'swr/mutation';
import { Button } from 'ui/Button';
import Icon from 'ui/Icon';
import { FloatingBox } from '../common/FloatingBox';
import { InListButton } from './InListButton';

interface Props {
  spaceId: string;
  userId: string;
}

const ExileConfirm: FC<Props> = ({ spaceId, userId }) => {
  const key = ['/spaces/members', spaceId] as const;
  const { trigger: exile, isMutating } = useSWRMutation(key, async ([_, spaceId]) => {
    const result = await post('/spaces/kick', { spaceId, userId }, {});
    return result.unwrap();
  }, {
    populateCache: (updatedMembers) => updatedMembers,
    revalidate: false,
  });

  return (
    <FloatingBox className="">
      <div>
        <FormattedMessage defaultMessage="Are you sure you want to exile this member?" />
      </div>
      <div className="text-right pt-2">
        <Button data-type="danger" disabled={isMutating} onClick={() => exile()}>
          <FormattedMessage defaultMessage="Exile" />
        </Button>
      </div>
    </FloatingBox>
  );
};

export const ExileButton: FC<Props> = ({ spaceId, userId }) => {
  const [isConfirming, setIsConfirming] = useState(false);
  const { x, y, strategy, refs, context } = useFloating({
    open: isConfirming,
    strategy: 'fixed',
    placement: 'bottom-end',
    onOpenChange: setIsConfirming,
    whileElementsMounted: autoUpdate,
  });
  const click = useClick(context, {});
  const dismiss = useDismiss(context);
  const { getReferenceProps, getFloatingProps } = useInteractions([
    click,
    dismiss,
  ]);
  return (
    <>
      <InListButton ref={refs.setReference} {...getReferenceProps()}>
        <Icon icon={UserX} />
        <FormattedMessage defaultMessage="Exile" />
      </InListButton>
      {isConfirming && (
        <FloatingPortal>
          <div ref={refs.setFloating} style={{ position: strategy, top: y ?? 0, left: x ?? 0 }} {...getFloatingProps()}>
            <ExileConfirm
              spaceId={spaceId}
              userId={userId}
            />
          </div>
        </FloatingPortal>
      )}
    </>
  );
};
