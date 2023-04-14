import { Preview } from 'api';
import type { FC } from 'react';
import { useIsFocused } from '../../state/chat-view';
import { OthersPreview } from './OthersPreview';
import { SelfPreview } from './SelfPreview';

interface Props {
  preview: Preview;
  className?: string;
  self: boolean;
}

export const ChatItemPreview: FC<Props> = ({ preview, self }) => {
  const paneFocused = useIsFocused();
  return paneFocused && self ? <SelfPreview preview={preview} /> : <OthersPreview preview={preview} />;
};
