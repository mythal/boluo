import { type Message } from '@boluo/api';
import { type FC } from 'react';
import { type IntlShape } from 'react-intl';
import { formatIntlDateTime } from '../../date';
import clsx from 'clsx';

interface Props {
  intl: IntlShape;
  message: Message;
  handleResultClick: (message: Message) => void;
}

export const ChannelSubPaneSearchResultMessage: FC<Props> = ({
  message,
  intl,
  handleResultClick,
}) => {
  return (
    <button
      type="button"
      key={message.id}
      onClick={() => handleResultClick(message)}
      className="border-border-subtle hover:bg-surface-interactive-hover w-full cursor-pointer px-3 py-2 text-left"
    >
      <div className="text-text-muted flex items-center justify-between gap-2 text-xs">
        <span className="font-semibold">{message.name || message.senderId}</span>
        <span>{formatIntlDateTime(intl, message.created)}</span>
      </div>
      <div
        className={clsx(
          'mt-1 leading-snug wrap-break-word whitespace-pre-wrap',
          message.folded ? 'line-through' : '',
          message.inGame ? 'text-base' : 'text-text-secondary text-sm',
        )}
      >
        {message.text}
      </div>
    </button>
  );
};
