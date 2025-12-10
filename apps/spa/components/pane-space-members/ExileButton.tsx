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
import { type FC, useState } from 'react';
import { FormattedMessage } from 'react-intl';
import useSWRMutation from 'swr/mutation';
import { Button } from '@boluo/ui/Button';
import Icon from '@boluo/ui/Icon';
import { FloatingBox } from '@boluo/ui/FloatingBox';
import { InListButton } from './InListButton';

interface Props {
  spaceId: string;
  userId: string;
}

const ExileConfirm: FC<Props> = ({ spaceId, userId }) => {
  const key = ['/spaces/members', spaceId] as const;
  const { trigger: exile, isMutating } = useSWRMutation(
    key,
    async ([_, spaceId]) => {
      const result = await post('/spaces/kick', { spaceId, userId }, {});
      return result.unwrap();
    },
    {
      populateCache: (updatedMembers) => updatedMembers,
      revalidate: false,
    },
  );

  return (
    <FloatingBox className="p-3">
      <div>
        <FormattedMessage defaultMessage="Are you sure you want to exile this member?" />
      </div>
      <div className="pt-2 text-right">
        <Button variant="danger" disabled={isMutating} onClick={() => void exile()}>
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
  const { getReferenceProps, getFloatingProps } = useInteractions([click, dismiss]);
  return (
    <>
      <InListButton ref={refs.setReference} {...getReferenceProps()}>
        <Icon icon={UserX} />
        <span>
          <FormattedMessage defaultMessage="Exile" />
        </span>
      </InListButton>
      {isConfirming && (
        <FloatingPortal>
          <div
            ref={refs.setFloating}
            style={{ position: strategy, top: y ?? 0, left: x ?? 0 }}
            {...getFloatingProps()}
          >
            <ExileConfirm spaceId={spaceId} userId={userId} />
          </div>
        </FloatingPortal>
      )}
    </>
  );
};
