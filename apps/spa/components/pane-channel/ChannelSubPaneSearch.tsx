import { type ApiError, type Message } from '@boluo/api';
import { get } from '@boluo/api-browser';
import { Loading } from '@boluo/ui/Loading';
import { PaneHeaderButton } from '@boluo/ui/PaneHeaderButton';
import { Failed } from '@boluo/ui/Failed';
import { Search, X } from '@boluo/icons';
import clsx from 'clsx';
import { type FC, useCallback, useMemo, useState } from 'react';
import { FormattedMessage, useIntl } from 'react-intl';
import { Button } from '@boluo/ui/Button';
import { TextInput } from '@boluo/ui/TextInput';

interface Props {
  channelId: string;
  onClose: () => void;
}

interface SearchMeta {
  scanned: number;
  matched: number;
  nextPos: number | null;
}

const formatDateTime = (intl: ReturnType<typeof useIntl>, value: string) => {
  const date = new Date(value);
  const dateText = intl.formatDate(date, { year: 'numeric', month: 'short', day: '2-digit' });
  const timeText = intl.formatTime(date, { hour: '2-digit', minute: '2-digit' });
  return `${dateText} ${timeText}`;
};

export const ChannelSubPaneSearch: FC<Props> = ({ channelId, onClose }) => {
  const intl = useIntl();
  const [keyword, setKeyword] = useState('');
  const [activeKeyword, setActiveKeyword] = useState('');
  const [results, setResults] = useState<Message[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [meta, setMeta] = useState<SearchMeta | null>(null);
  const [error, setError] = useState<ApiError | null>(null);

  const doSearch = useCallback(
    async (searchKeyword: string, pos: number | null, append: boolean) => {
      const trimmed = searchKeyword.trim();
      if (trimmed === '') {
        setError({
          code: 'BAD_REQUEST',
          message: intl.formatMessage({ defaultMessage: 'Please enter a keyword' }),
        });
        return;
      }
      setIsSearching(true);
      setError(null);
      const res = await get('/channels/search_messages', {
        channelId,
        keyword: trimmed,
        pos,
      });
      if (res.isOk) {
        const { messages, nextPos, scanned, matched } = res.some;
        setResults((prev) => (append ? [...prev, ...messages] : messages));
        setMeta((prevMeta) => ({
          scanned: scanned + (prevMeta?.scanned ?? 0),
          matched: matched + (prevMeta?.matched ?? 0),
          nextPos: nextPos ?? null,
        }));
        setActiveKeyword(trimmed);
      } else {
        setError(res.err);
      }
      setIsSearching(false);
    },
    [channelId, intl],
  );

  const submit = useCallback(
    (event: React.FormEvent) => {
      event.preventDefault();
      setResults([]);
      setMeta(null);
      void doSearch(keyword, null, false);
    },
    [doSearch, keyword],
  );

  const loadNext = useCallback(() => {
    if (meta?.nextPos == null || activeKeyword.trim() === '') return;
    void doSearch(activeKeyword, meta.nextPos, true);
  }, [activeKeyword, doSearch, meta]);

  const errorMessage = useMemo(() => {
    if (!error) return null;
    if ('message' in error && typeof error.message === 'string') {
      return error.message;
    }
    return intl.formatMessage({ defaultMessage: 'Failed to search messages' });
  }, [error, intl]);

  return (
    <div
      className={clsx(
        'border-border-subtle bg-pane-bg absolute inset-y-0 right-0 z-20 flex h-full w-xs flex-col border-l shadow-xl',
        '@xl:static @xl:shadow-none',
      )}
    >
      <div className="border-border-subtle flex items-center gap-2 border-b px-3 py-2 text-sm">
        <span>
          <FormattedMessage defaultMessage="Search" />
        </span>
        <div className="ml-auto flex items-center gap-1">
          <PaneHeaderButton
            onClick={onClose}
            title={intl.formatMessage({ defaultMessage: 'Close' })}
          >
            <X />
          </PaneHeaderButton>
        </div>
      </div>

      <form
        onSubmit={submit}
        className="border-border-subtle flex w-full gap-2 border-b px-3 py-2 text-sm"
      >
        <label className="sr-only">
          <FormattedMessage defaultMessage="Search keyword" />
        </label>
        <TextInput
          placeholder={intl.formatMessage({ defaultMessage: 'Search messages' })}
          className="shrink grow"
          value={keyword}
          onChange={(event) => setKeyword(event.target.value)}
        />
        <Button
          variant="primary"
          small
          type="submit"
          disabled={isSearching || keyword.trim() === ''}
        >
          <FormattedMessage defaultMessage="Search" />
        </Button>
      </form>

      <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
        {error && (
          <div className="px-3 py-2">
            <Failed code={error.code} message={errorMessage} />
          </div>
        )}
        <div className="flex-1 overflow-y-auto">
          {isSearching && results.length === 0 && (
            <div className="flex items-center gap-2 text-sm">
              <Loading />
              <FormattedMessage defaultMessage="Searching..." />
            </div>
          )}
          {!isSearching && results.length === 0 && activeKeyword && !error && (
            <div className="text-text-muted px-3 py-2 text-sm">
              <FormattedMessage defaultMessage="No messages matched." />
            </div>
          )}
          {results.map((message) => (
            <div
              key={message.id}
              className="border-border-subtle hover:bg-surface-interactive-hover px-3 py-2"
            >
              <div className="text-text-muted flex items-center justify-between gap-2 text-xs">
                <span className="font-semibold">{message.name || message.senderId}</span>
                <span>{formatDateTime(intl, message.created)}</span>
              </div>
              <div className="mt-1 text-sm leading-snug wrap-break-word whitespace-pre-wrap">
                {message.text}
              </div>
            </div>
          ))}
        </div>
        {meta?.nextPos != null && (
          <div className="border-border-subtle flex items-center gap-1 border-t px-3 py-2">
            <div className="text-text-secondary grow text-sm">
              <FormattedMessage
                defaultMessage="Scanned {scanned}"
                values={{ scanned: meta.scanned }}
              />
            </div>
            <Button type="button" onClick={loadNext} disabled={isSearching}>
              <Search />
              <FormattedMessage defaultMessage="Continue Search" />
            </Button>
          </div>
        )}
      </div>
    </div>
  );
};
