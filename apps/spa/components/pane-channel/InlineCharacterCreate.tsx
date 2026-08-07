import Plus from '@boluo/icons/Plus';
import { Button } from '@boluo/ui/Button';
import { TextInput } from '@boluo/ui/TextInput';
import { type FC, useState } from 'react';
import { FormattedMessage, useIntl } from 'react-intl';

interface Props {
  suggestedName: string;
  disabled: boolean;
  onCreate: (name: string) => Promise<void>;
}

export const InlineCharacterCreate: FC<Props> = ({ suggestedName, disabled, onCreate }) => {
  const intl = useIntl();
  const [expanded, setExpanded] = useState(false);
  const [name, setName] = useState('');
  const [isCreating, setIsCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const create = async () => {
    const trimmedName = name.trim();
    if (trimmedName === '') return;
    setError(null);
    setIsCreating(true);
    try {
      await onCreate(trimmedName);
      setName('');
      setExpanded(false);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Failed to create character');
    } finally {
      setIsCreating(false);
    }
  };

  if (!expanded) {
    return (
      <Button
        small
        disabled={disabled}
        onClick={() => {
          setName((current) => (current.trim() === '' ? suggestedName : current));
          setExpanded(true);
        }}
      >
        <Plus />
        <FormattedMessage defaultMessage="Create character" />
      </Button>
    );
  }

  return (
    <div className="space-y-2">
      <TextInput
        autoFocus
        value={name}
        onChange={(event) => setName(event.target.value)}
        onKeyDown={(event) => {
          if (event.key !== 'Enter') return;
          event.preventDefault();
          event.stopPropagation();
          void create();
        }}
        placeholder={intl.formatMessage({ defaultMessage: 'Character name' })}
        className="w-full"
      />
      <div className="flex justify-end gap-1">
        <Button small disabled={isCreating} onClick={() => setExpanded(false)}>
          <FormattedMessage defaultMessage="Cancel" />
        </Button>
        <Button
          small
          variant="primary"
          disabled={name.trim() === '' || isCreating || disabled}
          onClick={() => void create()}
        >
          <FormattedMessage defaultMessage="Create" />
        </Button>
      </div>
      {error && <div className="text-state-danger-text text-xs">{error}</div>}
    </div>
  );
};
