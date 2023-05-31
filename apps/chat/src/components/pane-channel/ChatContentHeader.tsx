import { FC, useRef } from 'react';
import { FormattedMessage } from 'react-intl';
import { useIsFullLoaded } from '../../hooks/useIsFullLoaded';
import { ChatContentHeaderLoadMore } from './ChatContentHeaderLoadMore';
import { VirtualListContext } from './ChatContentVirtualList';

interface Props {
  context?: VirtualListContext;
}

export const ChatContentHeader: FC<Props> = (props) => {
  const count = props.context?.filteredMessagesCount ?? 0;
  const isFullLoaded = useIsFullLoaded();
  const boxRef = useRef<HTMLDivElement>(null);

  return (
    <div ref={boxRef} className="h-28 py-4 flex flex-col gap-2 items-center justify-end select-none">
      {count !== 0 && (
        <span className="text-xs text-surface-500">
          <FormattedMessage defaultMessage="{count} filtered messages" values={{ count }} />
        </span>
      )}
      {isFullLoaded
        ? <span className="text-surface-500">Ω</span>
        : <ChatContentHeaderLoadMore />}
    </div>
  );
};
