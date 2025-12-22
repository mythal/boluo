import {
  type SearchMessagesResult,
  type Message,
  type SearchDirection,
  type SearchFilter,
  type SearchNameFilter,
} from '@boluo/api';
import { PaneHeaderButton } from '@boluo/ui/PaneHeaderButton';
import { Failed } from '@boluo/ui/Failed';
import Archive from '@boluo/icons/Archive';
import ArrowDownWideShort from '@boluo/icons/ArrowDownWideShort';
import ArrowUpWideShort from '@boluo/icons/ArrowUpWideShort';
import Mask from '@boluo/icons/Mask';
import SwatchBook from '@boluo/icons/SwatchBook';
import X from '@boluo/icons/X';
import clsx from 'clsx';
import { type FC, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { FormattedMessage, useIntl } from 'react-intl';
import { Button } from '@boluo/ui/Button';
import { TextInput } from '@boluo/ui/TextInput';
import { type SearchOptions, useSearchChannelMessages } from '../../hooks/useSearchChannelMessages';
import { LoadingText } from '@boluo/ui/LoadingText';
import Icon from '@boluo/ui/Icon';
import { useChannelAtoms } from '../../hooks/useChannelAtoms';
import { useSetAtom } from 'jotai';
import { ChannelSubPaneSearchResultMessage } from './ChannelSubPaneSearchResultMessage';

interface Props {
  channelId: string;
  onClose: () => void;
}

interface SearchMeta {
  scanned: number;
  matched: number;
  nextPos: number | null;
}

const emptyPages: SearchMessagesResult[] = [];

export const ChannelSubPaneSearch: FC<Props> = ({ channelId, onClose }) => {
  const intl = useIntl();
  const { scrollToMessageAtom } = useChannelAtoms();
  const setScrollToMessage = useSetAtom(scrollToMessageAtom);
  const [keyword, setKeyword] = useState('');
  const [activeKeyword, setActiveKeyword] = useState('');
  const [direction, setDirection] = useState<SearchDirection>('desc');
  const [includeArchived, setIncludeArchived] = useState(false);
  const [filter, setFilter] = useState<SearchFilter>('ALL');
  const [nameFilter, setNameFilter] = useState<SearchNameFilter>('ALL');
  const listRef = useRef<HTMLDivElement>(null);
  const loadMoreRef = useRef<HTMLDivElement>(null);
  const loadMoreTimeoutRef = useRef<number | undefined>(undefined);

  const searchOptions = useMemo<SearchOptions>(() => {
    return {
      direction,
      includeArchived,
      filter,
      nameFilter,
    };
  }, [direction, includeArchived, filter, nameFilter]);

  const {
    data,
    error: fetchError,
    isLoading,
    isValidating,
    mutate,
    setSize,
  } = useSearchChannelMessages(channelId, activeKeyword, searchOptions);

  const pages = data ?? emptyPages;

  const results = useMemo<Message[]>(() => pages.flatMap((page) => page.messages), [pages]);

  const meta = useMemo<SearchMeta | null>(() => {
    if (pages.length === 0) {
      return null;
    }
    const scanned = pages.reduce((sum, page) => sum + page.scanned, 0);
    const matched = pages.reduce((sum, page) => sum + page.matched, 0);
    const nextPos = pages[pages.length - 1]?.nextPos ?? null;
    return { scanned, matched, nextPos: nextPos ?? null };
  }, [pages]);

  const isSearching = (isLoading || isValidating) && activeKeyword.trim() !== '';

  const submit = useCallback(
    (event: React.FormEvent) => {
      event.preventDefault();
      const trimmed = keyword.trim();
      setActiveKeyword((prev) => {
        if (prev === trimmed) {
          void mutate();
          return prev;
        }
        return trimmed;
      });
      void setSize(1);
    },
    [keyword, mutate, setSize],
  );

  const changeDirection = useCallback(
    (nextDirection: SearchDirection) => {
      if (nextDirection === direction) return;
      setDirection(nextDirection);
      void setSize(1);
    },
    [direction, setDirection, setSize],
  );

  const loadNext = useCallback(() => {
    if (meta?.nextPos == null || activeKeyword.trim() === '') return;
    void setSize((prev) => prev + 1);
  }, [activeKeyword, meta, setSize]);

  const trimmedActiveKeyword = activeKeyword.trim();
  const canLoadMore = meta?.nextPos != null && trimmedActiveKeyword !== '';

  const scheduleLoadNext = useCallback(() => {
    if (!canLoadMore || isSearching) return;
    window.clearTimeout(loadMoreTimeoutRef.current);
    loadMoreTimeoutRef.current = window.setTimeout(() => {
      loadNext();
    }, 500);
  }, [canLoadMore, isSearching, loadNext]);

  useEffect(() => {
    const sentinel = loadMoreRef.current;
    const root = listRef.current;
    if (!sentinel || !root) return;

    const observer = new IntersectionObserver(
      (entries) => {
        const entry = entries[0];
        if (!entry?.isIntersecting) return;
        scheduleLoadNext();
      },
      { root, threshold: 0.5 },
    );

    observer.observe(sentinel);

    return () => observer.disconnect();
  }, [scheduleLoadNext]);

  useEffect(() => {
    return () => {
      window.clearTimeout(loadMoreTimeoutRef.current);
    };
  }, []);

  const handleResultClick = useCallback(
    (message: Message) => {
      setScrollToMessage({
        messageId: message.id,
        pos: message.pos,
        archived: message.folded ?? false,
        inGame: message.inGame ?? false,
      });
    },
    [setScrollToMessage],
  );

  const error = fetchError ?? null;

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
        'border-border-subtle bg-pane-bg absolute inset-y-0 right-0 z-40 flex h-full w-xs flex-col border-l shadow-xl',
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
        className="border-border-subtle flex w-full flex-col gap-2 border-b px-3 py-3 text-sm"
      >
        <div className="flex w-full gap-2">
          <label className="sr-only">
            <FormattedMessage defaultMessage="Search keyword" />
          </label>
          <TextInput
            placeholder={intl.formatMessage({ defaultMessage: 'Search messages' })}
            className="shrink grow"
            value={keyword}
            onChange={(event) => {
              setKeyword(event.target.value);
            }}
          />
          <Button
            variant="primary"
            small
            type="submit"
            disabled={isSearching || keyword.trim() === ''}
          >
            <FormattedMessage defaultMessage="Search" />
          </Button>
        </div>

        <div className="flex flex-wrap gap-1">
          <Button small aria-pressed={direction === 'asc'} onClick={() => changeDirection('asc')}>
            <ArrowDownWideShort />
            <FormattedMessage defaultMessage="Oldest First" />
          </Button>
          <Button small aria-pressed={direction === 'desc'} onClick={() => changeDirection('desc')}>
            <ArrowUpWideShort />
            <FormattedMessage defaultMessage="Newest First" />
          </Button>
          <Button
            small
            aria-pressed={includeArchived}
            onClick={() => {
              setIncludeArchived((prev) => !prev);
              void setSize(1);
            }}
          >
            <Icon icon={Archive} />
            <FormattedMessage defaultMessage="Include Archived" />
          </Button>
          <Button
            small
            aria-pressed={filter === 'IN_GAME'}
            onClick={() => {
              setFilter((prev) => (prev === 'IN_GAME' ? 'ALL' : 'IN_GAME'));
              void setSize(1);
            }}
          >
            <Icon icon={Mask} />
            <FormattedMessage defaultMessage="In-Game Only" />
          </Button>

          <Button
            small
            aria-pressed={nameFilter !== 'TEXT_ONLY'}
            onClick={() => {
              setNameFilter((prevNameFilter) => {
                if (prevNameFilter === 'TEXT_ONLY') {
                  return 'ALL';
                } else {
                  return 'TEXT_ONLY';
                }
              });
              void setSize(1);
            }}
          >
            <Icon icon={SwatchBook} />
            <FormattedMessage defaultMessage="Include Names" />
          </Button>
        </div>
      </form>

      <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
        {error && (
          <div className="px-3 py-2">
            <Failed code={error.code} message={errorMessage} />
          </div>
        )}
        <div ref={listRef} className="flex-1 overflow-y-auto">
          {isSearching && results.length === 0 && (
            <div className="flex items-center gap-2 px-3 text-sm">
              <FormattedMessage defaultMessage="Searching..." />
            </div>
          )}
          {!isSearching && results.length === 0 && activeKeyword && !error && (
            <div className="text-text-muted px-3 py-2 text-sm">
              <FormattedMessage defaultMessage="No messages matched." />
            </div>
          )}
          {results.map((message) => (
            <ChannelSubPaneSearchResultMessage
              key={message.id}
              message={message}
              intl={intl}
              handleResultClick={handleResultClick}
              keyword={trimmedActiveKeyword}
            />
          ))}
          <div
            ref={loadMoreRef}
            className="text-text-secondary flex h-8 items-center justify-center"
            aria-hidden
          >
            {meta?.nextPos != null && (
              <span>
                <FormattedMessage defaultMessage="Searching..." />
              </span>
            )}
          </div>
        </div>
        {meta != null && (
          <div className="border-border-subtle flex items-center gap-1 border-t px-3 py-2">
            <div className="text-text-secondary grow text-sm">
              <FormattedMessage
                defaultMessage="Scanned {scanned}, matched {matched}"
                values={{ scanned: meta.scanned, matched: meta.matched }}
              />
            </div>
            <div className="text-text-secondary flex items-center gap-1 text-sm">
              {isSearching && <LoadingText />}
              {!isSearching && meta.nextPos == null && (
                <FormattedMessage defaultMessage="All searched" />
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
