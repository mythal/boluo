import { PersonRunning } from 'icons';
import { useAtomValue, useSetAtom } from 'jotai';
import { selectAtom } from 'jotai/utils';
import { memo, useCallback, useMemo } from 'react';
import { FormattedMessage } from 'react-intl';
import { Button } from 'ui/Button';
import { useComposeAtom } from '../../hooks/useComposeAtom';

interface Props {
}

export const ToggleActionButton = memo<Props>(() => {
  const composeAtom = useComposeAtom();
  const dispatch = useSetAtom(composeAtom);
  const isAction = useAtomValue(useMemo(() => selectAtom(composeAtom, ({ isAction }) => isAction), [composeAtom]));
  const toggle = useCallback(() => dispatch({ type: 'toggleAction', payload: {} }), [dispatch]);
  return (
    <Button data-small data-type="switch" data-on={isAction} onClick={toggle}>
      <PersonRunning />
      <span className="hidden @xs:inline">
        <FormattedMessage defaultMessage="Action" />
      </span>
    </Button>
  );
});
ToggleActionButton.displayName = 'ToggleActionButton';
