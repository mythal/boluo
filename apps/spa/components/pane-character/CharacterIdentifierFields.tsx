import type { Character } from '@boluo/api';
import { get } from '@boluo/api-browser';
import Plus from '@boluo/icons/Plus';
import Trash from '@boluo/icons/Trash';
import { Button } from '@boluo/ui/Button';
import { TextInput } from '@boluo/ui/TextInput';
import { unwrap } from '@boluo/utils/result';
import type { FC } from 'react';
import { useFieldArray, useFormContext, type FieldError } from 'react-hook-form';
import { FormattedMessage, useIntl } from 'react-intl';
import type { CharacterEditValues } from './character-edit-types';
import { shouldCheckCharacterIdentifier } from './character-edit-validation';
import { isValidEntryKey } from './entry-metadata';

const MAX_ALIASES = 4;

interface ValidationFeedbackProps {
  disabled: boolean;
  error: FieldError | undefined;
  isValidating: boolean;
  isRetryable: boolean;
  onRetry: () => void;
}

const IdentifierValidationFeedback: FC<ValidationFeedbackProps> = ({
  disabled,
  error,
  isValidating,
  isRetryable,
  onRetry,
}) => (
  <>
    {isValidating && (
      <span className="text-text-muted block text-xs">
        <FormattedMessage defaultMessage="Checking identifier availability…" />
      </span>
    )}
    {error?.message != null && (
      <span className="text-state-danger-text block text-xs">{error.message}</span>
    )}
    {isRetryable && (
      <Button small disabled={disabled || isValidating} onClick={onRetry}>
        <FormattedMessage defaultMessage="Retry" />
      </Button>
    )}
  </>
);

interface Props {
  character: Character;
  disabled: boolean;
  identifierConflict: string | undefined;
  onIdentifierChange: () => void;
}

export const CharacterIdentifierFields: FC<Props> = ({
  character,
  disabled,
  identifierConflict,
  onIdentifierChange,
}) => {
  const intl = useIntl();
  const {
    control,
    register,
    trigger,
    formState: { errors, validatingFields },
  } = useFormContext<CharacterEditValues>();
  const {
    fields: aliases,
    append: appendAlias,
    remove: removeAlias,
  } = useFieldArray({ control, name: 'aliases' });
  const identifierTakenMessage = intl.formatMessage({
    defaultMessage: 'This character identifier is already in use.',
  });
  const identifierCheckFailedMessage = intl.formatMessage({
    defaultMessage: 'Could not check identifier availability. Try again.',
  });
  const invalidIdentifierMessage = intl.formatMessage({
    defaultMessage: 'Use 1–64 letters, numbers, emoji, or supported punctuation, without spaces.',
  });

  const checkIdentifier = async (identifier: string, originalValue: string | null) => {
    const trimmedIdentifier = identifier.trim();
    if (!shouldCheckCharacterIdentifier(trimmedIdentifier, originalValue)) return true;
    try {
      const available = await get('/characters/check_identifier', {
        spaceId: character.spaceId,
        characterId: character.id,
        identifier: trimmedIdentifier,
      }).then(unwrap);
      return available || identifierTakenMessage;
    } catch {
      return identifierCheckFailedMessage;
    }
  };
  const isCheckFailure = (error: FieldError | undefined) =>
    error?.type === 'available' && error.message === identifierCheckFailedMessage;

  const keyRegistration = register('key', {
    validate: {
      valid: (value) => isValidEntryKey(value.trim()) || invalidIdentifierMessage,
      available: (value) => checkIdentifier(value, character.key),
    },
  });
  const keyError = errors.key;

  return (
    <>
      <label className="flex min-w-0 flex-col gap-1">
        <span className="text-text-secondary text-sm">
          <FormattedMessage defaultMessage="Character key" />
        </span>
        <TextInput
          {...keyRegistration}
          disabled={disabled}
          variant={keyError != null || identifierConflict != null ? 'error' : 'normal'}
          onChange={(event) => {
            onIdentifierChange();
            void keyRegistration.onChange(event);
          }}
        />
        <span className="text-text-muted text-xs">
          <FormattedMessage defaultMessage="The primary identifier used by commands." />
        </span>
        <IdentifierValidationFeedback
          disabled={disabled}
          error={keyError}
          isValidating={validatingFields.key === true}
          isRetryable={isCheckFailure(keyError)}
          onRetry={() => void trigger('key')}
        />
      </label>
      <div className="flex flex-col gap-1 @md:col-span-2">
        <span className="text-text-secondary text-sm">
          <FormattedMessage defaultMessage="Aliases" />
        </span>
        <span className="text-text-muted text-xs">
          <FormattedMessage defaultMessage="Identifiers used to refer to this character." />
        </span>
        {aliases.length > 0 && (
          <div className="grid gap-2 @md:grid-cols-2">
            {aliases.map((alias, index) => {
              const aliasRegistration = register(`aliases.${index}.value`, {
                validate: {
                  valid: (value) =>
                    value.trim() === '' ||
                    isValidEntryKey(value.trim()) ||
                    invalidIdentifierMessage,
                  available: (value) =>
                    value.trim() === '' || checkIdentifier(value, alias.originalValue),
                },
              });
              const aliasError = errors.aliases?.[index]?.value;
              const aliasIsValidating = validatingFields.aliases?.[index]?.value === true;
              return (
                <div className="min-w-0 space-y-1" key={alias.id}>
                  <div className="flex items-stretch gap-2">
                    <TextInput
                      {...aliasRegistration}
                      className="min-w-0 flex-1"
                      disabled={disabled}
                      variant={
                        aliasError != null || identifierConflict != null ? 'error' : 'normal'
                      }
                      aria-label={intl.formatMessage(
                        { defaultMessage: 'Alias {number}' },
                        { number: index + 1 },
                      )}
                      onChange={(event) => {
                        onIdentifierChange();
                        void aliasRegistration.onChange(event);
                      }}
                    />
                    <Button
                      small
                      className="shrink-0 self-stretch"
                      disabled={disabled}
                      aria-label={intl.formatMessage(
                        { defaultMessage: 'Remove alias {number}' },
                        { number: index + 1 },
                      )}
                      onClick={() => {
                        onIdentifierChange();
                        removeAlias(index);
                      }}
                    >
                      <Trash />
                    </Button>
                  </div>
                  <IdentifierValidationFeedback
                    disabled={disabled}
                    error={aliasError}
                    isValidating={aliasIsValidating}
                    isRetryable={isCheckFailure(aliasError)}
                    onRetry={() => void trigger(`aliases.${index}.value`)}
                  />
                </div>
              );
            })}
          </div>
        )}
        {identifierConflict != null && (
          <span className="text-state-danger-text text-xs">{identifierConflict}</span>
        )}
        <div>
          <Button
            small
            disabled={disabled || aliases.length >= MAX_ALIASES}
            onClick={() => {
              onIdentifierChange();
              appendAlias({ value: '', originalValue: null });
            }}
          >
            <Plus />
            <FormattedMessage defaultMessage="Add alias" />
          </Button>
        </div>
      </div>
    </>
  );
};
