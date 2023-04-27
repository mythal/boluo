import { Preview } from 'api';
import { useAtomValue } from 'jotai';
import { selectAtom } from 'jotai/utils';
import { FC, useMemo } from 'react';
import { useComposeAtom } from '../../hooks/useComposeAtom';
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
  const composeAtom = useComposeAtom();
  const composePreviewId = useAtomValue(
    useMemo(() => selectAtom(composeAtom, compose => compose.previewId), [composeAtom]),
  );
  return paneFocused && preview.id === composePreviewId && self
    ? <SelfPreview preview={preview} />
    : <OthersPreview preview={preview} />;
};
