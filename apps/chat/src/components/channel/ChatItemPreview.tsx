import type { FC } from 'react';
import { usePaneIsFocus } from '../../hooks/usePaneIsFocus';
import { PreviewItem } from '../../state/channel.types';
import { OthersPreview } from './OthersPreview';
import { SelfPreview } from './SelfPreview';

interface Props {
  preview: PreviewItem;
  className?: string;
  self: boolean;
}

export const ChatItemPreview: FC<Props> = ({ preview, self }) => {
  const paneFocused = usePaneIsFocus();
  return paneFocused && self
    ? <SelfPreview preview={preview} />
    : <OthersPreview preview={preview} />;
};
