import { PersonRunning } from '@boluo/icons';
import { useAtomValue, useSetAtom } from 'jotai';
import { memo, useCallback } from 'react';
import { FormattedMessage } from 'react-intl';
import { Button } from '@boluo/ui/Button';
import { useChannelAtoms } from '../../hooks/useChannelAtoms';

interface Props {}

export const ToggleActionButton = memo<Props>(() => {
  const { composeAtom, isActionAtom } = useChannelAtoms();
  const dispatch = useSetAtom(composeAtom);
  const isAction = useAtomValue(isActionAtom);
  const toggle = useCallback(() => dispatch({ type: 'toggleAction', payload: {} }), [dispatch]);
  return (
    <Button data-small data-type="switch" data-on={isAction} onClick={toggle}>
      <PersonRunning />
      <span className="@md:inline hidden">
        <FormattedMessage defaultMessage="Action" />
      </span>
    </Button>
  );
});
ToggleActionButton.displayName = 'ToggleActionButton';
