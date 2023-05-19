import { FC } from 'react';
import { CancelEditingButton } from './CancelEditingButton';
import { ToggleActionButton } from './ToggleActionButton';
import { ToggleBroadcastButton } from './ToggleBroadcastButton';

interface Props {
  className?: string;
}

export const SelfPreviewOperations: FC<Props> = ({ className }) => {
  return (
    <div className={className} ref={(node) => node?.setAttribute('data-enter', 'true')}>
      <ToggleActionButton />
      <ToggleBroadcastButton />
      <CancelEditingButton />
    </div>
  );
};
