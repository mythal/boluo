import { type FC, useRef } from 'react';
import { FormattedMessage, useIntl } from 'react-intl';
import { useIsFullLoaded } from '../../hooks/useIsFullLoaded';
import { ChatContentHeaderLoadMore } from './ChatContentHeaderLoadMore';
import { type VirtualListContext } from './ChatContentVirtualList';
import { ButtonInline } from '@boluo/ui/ButtonInline';
import { Delay } from '../Delay';
import { FallbackIcon } from '@boluo/ui/FallbackIcon';
import Icon from '@boluo/ui/Icon';
import { FilterX } from '@boluo/icons';
import { useClearFilter } from '../../hooks/useClearFilter';

interface Props {
  context?: VirtualListContext;
}

export const ChatContentHeader: FC<Props> = (props) => {
  const intl = useIntl();
  const clear = useClearFilter();
  const count = props.context?.filteredMessagesCount ?? 0;
  const isFullLoaded = useIsFullLoaded();
  const boxRef = useRef<HTMLDivElement>(null);
  const noMore = intl.formatMessage({ defaultMessage: 'No more messages' });
  return (
    <div
      ref={boxRef}
      className="flex h-28 flex-col items-center justify-end gap-2 py-4 select-none"
    >
      {count !== 0 && (
        <span className="text-xs">
          <span className="text-text-muted text-xs">
            <FormattedMessage defaultMessage="{count} filtered messages" values={{ count }} />
          </span>
          <ButtonInline className="ml-1" onClick={clear}>
            <span className="mr-0.5">
              <Delay fallback={<FallbackIcon />}>
                <Icon icon={FilterX} />
              </Delay>
            </span>
            <FormattedMessage defaultMessage="Show" />
          </ButtonInline>
        </span>
      )}
      {isFullLoaded ? (
        <span className="text-text-muted text-lg" title={noMore}>
          Ω
        </span>
      ) : (
        <ChatContentHeaderLoadMore />
      )}
    </div>
  );
};
