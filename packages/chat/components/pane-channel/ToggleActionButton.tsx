import { PersonRunning } from 'icons';
import { useAtomValue, useSetAtom } from 'jotai';
import { selectAtom } from 'jotai/utils';
import { memo, useCallback, useMemo } from 'react';
import { FormattedMessage } from 'react-intl';
import { Button } from 'ui/Button';
import { useChannelAtoms } from '../../hooks/useChannelAtoms';
import { useComposeAtom } from '../../hooks/useComposeAtom';

interface Props {
}

export const ToggleActionButton = memo<Props>(() => {
  const { composeAtom, isActionAtom } = useChannelAtoms();
  const dispatch = useSetAtom(composeAtom);
  const isAction = useAtomValue(isActionAtom);
  const toggle = useCallback(() => dispatch({ type: 'toggleAction', payload: {} }), [dispatch]);
  return (
    <Button data-small data-type="switch" data-on={isAction} onClick={toggle}>
      <PersonRunning />
      <span className="hidden @md:inline">
        <FormattedMessage defaultMessage="Action" />
      </span>
    </Button>
  );
});
ToggleActionButton.displayName = 'ToggleActionButton';
