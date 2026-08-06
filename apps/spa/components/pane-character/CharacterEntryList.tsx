import type { EntryComponentMatch } from '@boluo/api';
import { Badge } from '@boluo/ui/Badge';
import { Failed } from '@boluo/ui/Failed';
import { Loading } from '@boluo/ui/Loading';
import { type FC } from 'react';
import { FormattedMessage } from 'react-intl';
import { formatCounterValue, parseCounterComponent } from './entry-components';

const CharacterEntryItem: FC<{
  entry: EntryComponentMatch;
}> = ({ entry }) => {
  const counter = parseCounterComponent(entry.component);
  return (
    <div className="border-border-default bg-surface-default flex items-center gap-3 rounded border px-3 py-2">
      <div className="min-w-0 grow">
        <div className="truncate font-medium">{entry.displayName || entry.key}</div>
        {entry.displayName && entry.displayName !== entry.key && (
          <div className="text-text-muted truncate font-mono text-xs">{entry.key}</div>
        )}
        {counter == null && (
          <div className="text-text-muted text-xs">
            <FormattedMessage
              defaultMessage="Unsupported component: {types}"
              values={{ types: entry.componentType }}
            />
          </div>
        )}
      </div>
      <Badge>
        {counter != null ? (
          <span className="font-mono text-base">{formatCounterValue(counter)}</span>
        ) : (
          <FormattedMessage defaultMessage="State" />
        )}
      </Badge>
    </div>
  );
};

interface Props {
  entries: EntryComponentMatch[] | undefined;
  isLoading: boolean;
  errorCode?: string;
}

export const CharacterEntryList: FC<Props> = ({ entries, isLoading, errorCode }) => {
  const sortedEntries = [...(entries ?? [])].sort((a, b) => a.pos - b.pos);
  return (
    <div className="p-pane space-y-3">
      {errorCode && (
        <Failed
          code={errorCode}
          title={<FormattedMessage defaultMessage="Failed to query character states" />}
        />
      )}
      {isLoading && <Loading />}
      {!isLoading && errorCode == null && sortedEntries.length === 0 && (
        <div className="text-text-muted py-4 text-center text-sm">
          <FormattedMessage defaultMessage="No states have been added yet." />
        </div>
      )}
      {!isLoading && errorCode == null && (
        <div className="space-y-2">
          {sortedEntries.map((entry) => (
            <CharacterEntryItem key={entry.id} entry={entry} />
          ))}
        </div>
      )}
    </div>
  );
};
