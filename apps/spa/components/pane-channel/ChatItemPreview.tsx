import type { FC } from 'react';
import { type PreviewItem } from '../../state/channel.types';
import { OthersPreview } from './OthersPreview';
import { SelfPreview } from './SelfPreview';
import { useMember } from '../../hooks/useMember';

interface Props {
  preview: PreviewItem;
  className?: string;
  isLast: boolean;
}

export const ChatItemPreview: FC<Props> = ({ preview, isLast }) => {
  const myMember = useMember();
  return myMember?.user.id === preview.senderId ? (
    <SelfPreview isLast={isLast} preview={preview} myMember={myMember} />
  ) : (
    <OthersPreview isLast={isLast} preview={preview} />
  );
};
