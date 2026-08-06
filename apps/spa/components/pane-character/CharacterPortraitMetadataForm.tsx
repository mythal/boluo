import type { EntryComponentMatch } from '@boluo/api';
import Save from '@boluo/icons/Save';
import { Button } from '@boluo/ui/Button';
import { TextInput } from '@boluo/ui/TextInput';
import { type FC, useState } from 'react';
import { FormattedMessage } from 'react-intl';
import { isValidEntryDisplayName, isValidEntryKey } from './entry-metadata';

interface Props {
  entry: EntryComponentMatch;
  disabled: boolean;
  onSubmit: (update: EntryMetadataUpdate) => void;
}

interface EntryMetadataUpdate {
  entry: EntryComponentMatch;
  key: string;
  displayName: string;
}

export const CharacterPortraitMetadataForm: FC<Props> = ({ entry, disabled, onSubmit }) => {
  const [key, setKey] = useState(entry.key);
  const [displayName, setDisplayName] = useState(entry.displayName);
  const normalizedKey = key.trim();
  const normalizedDisplayName = displayName.trim();
  const keyValid = isValidEntryKey(key);
  const displayNameValid = isValidEntryDisplayName(displayName);
  const changed = normalizedKey !== entry.key || normalizedDisplayName !== entry.displayName;

  const reset = () => {
    setKey(entry.key);
    setDisplayName(entry.displayName);
  };

  return (
    <form
      className="border-border-subtle mt-4 space-y-3 border-t pt-4"
      onSubmit={(event) => {
        event.preventDefault();
        if (changed && keyValid && displayNameValid) {
          onSubmit({ entry, key: normalizedKey, displayName: normalizedDisplayName });
        }
      }}
    >
      <h4 className="text-text-secondary text-sm font-medium">
        <FormattedMessage defaultMessage="Entry metadata" />
      </h4>
      <div className="grid gap-3 @md:grid-cols-2">
        <label className="flex min-w-0 flex-col gap-1">
          <span className="text-text-secondary text-sm">
            <FormattedMessage defaultMessage="Display name" />
          </span>
          <TextInput
            value={displayName}
            disabled={disabled}
            variant={displayNameValid ? 'normal' : 'error'}
            onChange={(event) => setDisplayName(event.target.value)}
          />
          {!displayNameValid && (
            <span className="text-state-danger-text text-xs">
              <FormattedMessage defaultMessage="Use 2–32 characters." />
            </span>
          )}
        </label>
        <label className="flex min-w-0 flex-col gap-1">
          <span className="text-text-secondary text-sm">
            <FormattedMessage defaultMessage="Entry key" />
          </span>
          <TextInput
            value={key}
            disabled={disabled}
            variant={keyValid ? 'normal' : 'error'}
            onChange={(event) => setKey(event.target.value)}
          />
          {!keyValid && (
            <span className="text-state-danger-text text-xs">
              <FormattedMessage defaultMessage="Use 1–64 letters, numbers, emoji, or supported punctuation, without spaces." />
            </span>
          )}
        </label>
      </div>
      <div className="flex justify-end gap-2">
        <Button type="button" small disabled={disabled || !changed} onClick={reset}>
          <FormattedMessage defaultMessage="Reset" />
        </Button>
        <Button
          type="submit"
          small
          variant="primary"
          disabled={disabled || !changed || !keyValid || !displayNameValid}
        >
          <Save />
          <FormattedMessage defaultMessage="Save metadata" />
        </Button>
      </div>
    </form>
  );
};
