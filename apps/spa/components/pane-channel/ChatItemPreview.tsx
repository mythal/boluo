import type { FC } from 'react';
import { useMyChannelMember } from '../../hooks/useMyChannelMember';
import { PreviewItem } from '../../state/channel.types';
import { OthersPreview } from './OthersPreview';
import { SelfPreview } from './SelfPreview';
import { ResolvedTheme } from '@boluo/theme';

interface Props {
  preview: PreviewItem;
  className?: string;
  theme: ResolvedTheme;
  isLast: boolean;
}

export const ChatItemPreview: FC<Props> = ({ preview, theme, isLast }) => {
  const myMember = useMyChannelMember(preview.channelId);
  return myMember.isOk && myMember.some.user.id === preview.senderId ? (
    <SelfPreview isLast={isLast} preview={preview} myMember={myMember.some} theme={theme} />
  ) : (
    <OthersPreview isLast={isLast} preview={preview} theme={theme} />
  );
};
