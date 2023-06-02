import type { FC } from 'react';
import { useMyChannelMember } from '../../hooks/useMyChannelMember';
import { usePaneIsFocus } from '../../hooks/usePaneIsFocus';
import { PreviewItem } from '../../state/channel.types';
import { OthersPreview } from './OthersPreview';
import { SelfPreview } from './SelfPreview';

interface Props {
  preview: PreviewItem;
  className?: string;
}

export const ChatItemPreview: FC<Props> = ({ preview }) => {
  const paneFocused = usePaneIsFocus();
  const myMember = useMyChannelMember(preview.channelId);
  return paneFocused && myMember?.user.id === preview.senderId
    ? <SelfPreview preview={preview} />
    : <OthersPreview preview={preview} />;
};
