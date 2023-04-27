import { useAtomValue, useSetAtom } from 'jotai';
import { selectAtom } from 'jotai/utils';
import { memo, useCallback, useMemo } from 'react';
import { Button } from 'ui';
import { useComposeAtom } from '../../hooks/useComposeAtom';
import { makeComposeAction } from '../../state/compose.actions';

interface Props {
}

export const ToggleActionButton = memo<Props>(() => {
  const composeAtom = useComposeAtom();
  const dispatch = useSetAtom(composeAtom);
  const isAction = useAtomValue(useMemo(() => selectAtom(composeAtom, ({ isAction }) => isAction), [composeAtom]));
  const toggle = useCallback(() => dispatch(makeComposeAction('toggleAction', {})), [dispatch]);
  return (
    <Button data-small data-type="switch" data-on={isAction} onClick={toggle}>
      Action
    </Button>
  );
});
ToggleActionButton.displayName = 'ToggleActionButton';
