import { FC } from 'react';
import { CancelEditingButton } from './CancelEditingButton';
import { FileButton } from './FileButton';
import { ToggleActionButton } from './ToggleActionButton';
import { ToggleBroadcastButton } from './ToggleBroadcastButton';
import { WhisperButton } from './WhisperButton';

interface Props {
  className?: string;
}

export const SelfPreviewOperations: FC<Props> = ({ className }) => {
  return (
    <div className={className} ref={(node) => node?.setAttribute('data-enter', 'true')}>
      <ToggleBroadcastButton />
      <FileButton />
      <WhisperButton />
      <CancelEditingButton />
    </div>
  );
};
