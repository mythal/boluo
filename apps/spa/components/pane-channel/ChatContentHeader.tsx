import { type FC, useRef } from 'react';
import { FormattedMessage } from 'react-intl';
import { useIsFullLoaded } from '../../hooks/useIsFullLoaded';
import { ChatContentHeaderLoadMore } from './ChatContentHeaderLoadMore';
import { type VirtualListContext } from './ChatContentVirtualList';

interface Props {
  context?: VirtualListContext;
}

export const ChatContentHeader: FC<Props> = (props) => {
  const count = props.context?.filteredMessagesCount ?? 0;
  const isFullLoaded = useIsFullLoaded();
  const boxRef = useRef<HTMLDivElement>(null);

  return (
    <div ref={boxRef} className="flex h-28 select-none flex-col items-center justify-end gap-2 py-4">
      {count !== 0 && (
        <span className="text-surface-500 text-xs">
          <FormattedMessage defaultMessage="{count} filtered messages" values={{ count }} />
        </span>
      )}
      {isFullLoaded ? <span className="text-surface-500">Ω</span> : <ChatContentHeaderLoadMore />}
    </div>
  );
};
