import type { FC } from 'react';
import { useIsFocused } from '../../state/chat-view';
import { PreviewItem } from '../../types/chat-items';
import { OthersPreview } from './OthersPreview';
import { SelfPreview } from './SelfPreview';

interface Props {
  preview: PreviewItem;
  className?: string;
  self: boolean;
}

export const ChatItemPreview: FC<Props> = ({ preview, self }) => {
  const paneFocused = useIsFocused();
  return paneFocused && self
    ? <SelfPreview preview={preview} />
    : <OthersPreview preview={preview} />;
};
