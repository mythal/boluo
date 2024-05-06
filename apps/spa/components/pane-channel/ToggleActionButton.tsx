import { PersonRunning } from '@boluo/icons';
import { useSetAtom } from 'jotai';
import { memo, useCallback } from 'react';
import { useChannelAtoms } from '../../hooks/useChannelAtoms';
import { useIntl } from 'react-intl';

interface Props {
  isAction: boolean;
}

export const ToggleActionButton = memo<Props>(({ isAction }) => {
  const { composeAtom } = useChannelAtoms();
  const intl = useIntl();
  const dispatch = useSetAtom(composeAtom);
  const toggle = useCallback(() => dispatch({ type: 'toggleAction', payload: {} }), [dispatch]);
  return (
    <button
      aria-pressed={isAction}
      onClick={toggle}
      title={intl.formatMessage({ defaultMessage: 'Toggle Action' })}
      className={`${isAction ? 'bg-preview-button-hover-bg' : 'bg-preview-button-bg'} rounded-sm p-1 text-sm`}
    >
      <PersonRunning />
    </button>
  );
});
ToggleActionButton.displayName = 'ToggleActionButton';
