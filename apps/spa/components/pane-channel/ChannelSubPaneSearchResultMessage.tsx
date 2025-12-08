import { type Message } from '@boluo/api';
import { type FC, useMemo, type ReactNode } from 'react';
import { type IntlShape } from 'react-intl';
import { formatIntlDateTime } from '../../date';
import clsx from 'clsx';

interface Props {
  intl: IntlShape;
  message: Message;
  handleResultClick: (message: Message) => void;
  keyword: string;
}

const escapeRegExp = (value: string): string => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

const highlightKeyword = (text: string, keyword: string): ReactNode => {
  const trimmed = keyword.trim();
  if (trimmed === '') return text;

  const escapedKeyword = escapeRegExp(trimmed);
  const regex = new RegExp(`(${escapedKeyword})`, 'gi');
  const parts = text.split(regex);

  if (parts.length === 1) return text;

  return parts.map((part, index) =>
    index % 2 === 1 ? (
      <mark key={index} className="bg-brand-strong/20 text-text-primary rounded px-0.5">
        {part}
      </mark>
    ) : (
      part
    ),
  );
};

export const ChannelSubPaneSearchResultMessage: FC<Props> = ({
  message,
  intl,
  handleResultClick,
  keyword,
}) => {
  const highlightedName = useMemo(
    () => highlightKeyword(message.name || message.senderId, keyword),
    [keyword, message.name, message.senderId],
  );

  const highlightedText = useMemo(
    () => highlightKeyword(message.text, keyword),
    [keyword, message.text],
  );

  return (
    <button
      type="button"
      key={message.id}
      onClick={() => handleResultClick(message)}
      className="border-border-subtle hover:bg-surface-interactive-hover w-full cursor-pointer px-3 py-2 text-left"
    >
      <div className="text-text-muted flex items-center justify-between gap-2 text-xs">
        <span className="font-semibold">{highlightedName}</span>
        <span>{formatIntlDateTime(intl, message.created)}</span>
      </div>
      <div
        className={clsx(
          'mt-1 leading-snug wrap-break-word whitespace-pre-wrap',
          message.folded ? 'line-through' : '',
          message.inGame ? 'text-base' : 'text-text-secondary text-sm',
        )}
      >
        {highlightedText}
      </div>
    </button>
  );
};
