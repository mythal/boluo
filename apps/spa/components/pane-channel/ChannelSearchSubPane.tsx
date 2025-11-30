import { type ApiError, type Message } from '@boluo/api';
import { get } from '@boluo/api-browser';
import { Loading } from '@boluo/ui/Loading';
import { PaneHeaderButton } from '@boluo/ui/PaneHeaderButton';
import { Failed } from '@boluo/ui/Failed';
import { Search, X } from '@boluo/icons';
import clsx from 'clsx';
import { type FC, useCallback, useMemo, useState } from 'react';
import { FormattedMessage, useIntl } from 'react-intl';

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

export const ChannelSearchSubPane: FC<Props> = ({ channelId, onClose }) => {
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
        setMeta({ scanned, matched, nextPos: nextPos ?? null });
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

  const metaInfo = useMemo(() => {
    if (!meta) return null;
    return (
      <div className="text-text-muted text-xs">
        <FormattedMessage
          defaultMessage="{matched} matched · {scanned} scanned"
          values={{ matched: meta.matched, scanned: meta.scanned }}
        />
      </div>
    );
  }, [meta]);

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
        'border-border-subtle bg-pane-bg relative flex h-full max-w-xs min-w-68 flex-col border-l',
      )}
    >
      <div className="border-border-subtle flex items-center gap-2 border-b px-3 py-2 text-sm">
        <span className="font-semibold">
          <FormattedMessage defaultMessage="Search" />
        </span>
        <span className="text-text-muted truncate text-xs">
          {activeKeyword && (
            <FormattedMessage
              defaultMessage="Keyword: {keyword}"
              values={{ keyword: activeKeyword }}
            />
          )}
        </span>
        <div className="ml-auto flex gap-1">
          {metaInfo}
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
        className="border-border-subtle flex items-center gap-2 border-b px-3 py-2 text-sm"
      >
        <label className="sr-only">
          <FormattedMessage defaultMessage="Search keyword" />
        </label>
        <input
          className="border-border-subtle focus:border-border-strong focus:ring-border-strong bg-surface-default w-full rounded border px-2 py-1 text-sm outline-none"
          placeholder={intl.formatMessage({ defaultMessage: 'Search messages' })}
          value={keyword}
          onChange={(event) => setKeyword(event.target.value)}
        />
        <button
          type="submit"
          className="bg-brand-strong hover:bg-brand-strong/90 rounded px-3 py-1 text-sm font-semibold text-white transition-colors disabled:opacity-60"
          disabled={isSearching}
        >
          <FormattedMessage defaultMessage="Search" />
        </button>
      </form>

      <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
        {error && (
          <div className="px-3 py-2">
            <Failed code={error.code} message={errorMessage} />
          </div>
        )}
        <div className="flex-1 space-y-2 overflow-y-auto px-3 py-3">
          {isSearching && results.length === 0 && (
            <div className="flex items-center gap-2 text-sm">
              <Loading />
              <FormattedMessage defaultMessage="Searching..." />
            </div>
          )}
          {!isSearching && results.length === 0 && activeKeyword && !error && (
            <div className="text-text-muted text-sm">
              <FormattedMessage defaultMessage="No messages matched." />
            </div>
          )}
          {results.map((message) => (
            <div
              key={message.id}
              className="border-border-subtle bg-surface-default rounded border p-2 shadow-sm"
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
          <div className="border-border-subtle border-t px-3 py-2">
            <button
              type="button"
              onClick={loadNext}
              disabled={isSearching}
              className="hover:border-border-strong flex w-full items-center justify-center gap-2 rounded border px-3 py-1 text-sm font-semibold transition-colors disabled:opacity-60"
            >
              <Search />
              <FormattedMessage defaultMessage="Search next 200" />
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
