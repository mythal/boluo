import type { FC } from 'react';
import { useMyChannelMember } from '../../hooks/useMyChannelMember';
import { usePaneIsFocus } from '../../hooks/usePaneIsFocus';
import { PreviewItem } from '../../state/channel.types';
import { OthersPreview } from './OthersPreview';
import { SelfPreview } from './SelfPreview';
import { ResolvedTheme } from '@boluo/theme';

interface Props {
  preview: PreviewItem;
  className?: string;
  theme: ResolvedTheme;
}

export const ChatItemPreview: FC<Props> = ({ preview, theme }) => {
  const paneFocused = usePaneIsFocus();
  const myMember = useMyChannelMember(preview.channelId);
  return paneFocused && myMember.isOk && myMember.some.user.id === preview.senderId ? (
    <SelfPreview preview={preview} myMember={myMember.some} theme={theme} />
  ) : (
    <OthersPreview preview={preview} theme={theme} />
  );
};
