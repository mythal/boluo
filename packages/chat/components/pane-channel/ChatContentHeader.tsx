import { FC, useRef } from 'react';
import { FormattedMessage } from 'react-intl';
import { useIsFullLoaded } from '../../hooks/useIsFullLoaded';
import { ChatContentHeaderLoadMore } from './ChatContentHeaderLoadMore';

interface Props {
  isTopChunk: boolean;
  chunkUp: () => void;
  filteredMessagesCount: number;
}

export const ChatContentHeader: FC<Props> = ({ filteredMessagesCount: count, chunkUp, isTopChunk }) => {
  const isFullLoaded = useIsFullLoaded();
  const boxRef = useRef<HTMLDivElement>(null);

  return (
    <div ref={boxRef} className="flex h-28 select-none flex-col items-center justify-end gap-2 py-4">
      {count !== 0 && (
        <span className="text-text-lighter text-xs">
          <FormattedMessage defaultMessage="{count} filtered messages" values={{ count }} />
        </span>
      )}
      {isFullLoaded && isTopChunk ? (
        <span className="text-text-lighter">Ω</span>
      ) : (
        <ChatContentHeaderLoadMore isTopChunk={isTopChunk} chunkUp={chunkUp} />
      )}
    </div>
  );
};
