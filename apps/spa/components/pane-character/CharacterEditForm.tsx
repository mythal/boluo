import type { Character } from '@boluo/api';
import { computeColors, isGameColor, parseGameColor, parseHexColor } from '@boluo/color';
import { classifyLightOrDark } from '@boluo/theme';
import { Button } from '@boluo/ui/Button';
import { TextArea, TextInput } from '@boluo/ui/TextInput';
import { useState, type FC } from 'react';
import { FormProvider, useController, useForm } from 'react-hook-form';
import { FormattedMessage, useIntl } from 'react-intl';
import { useResolvedTheme } from '../../hooks/useResolvedTheme';
import { ColorEditor } from '../ColorEditor';
import { PaneFooterBox } from '../PaneFooterBox';
import { CharacterAccessFields } from './CharacterAccessFields';
import { CharacterIdentifierFields } from './CharacterIdentifierFields';
import type { CharacterEditDraft, CharacterEditValues } from './character-edit-types';
import { CharacterIdentifierConflictError, CharacterStaleError } from './character-errors';
import { useCharacterAccessOptions } from './character-permissions';

const MAX_CHARACTER_NAME_LENGTH = 32;
const MAX_CHARACTER_DESCRIPTION_LENGTH = 512;

interface Props {
  character: Character;
  fallbackColor?: string;
  fallbackColorSeed?: string;
  onCancel: () => void;
  onSave: (draft: CharacterEditDraft) => Promise<void>;
}

export const CharacterEditForm: FC<Props> = ({
  character,
  fallbackColor,
  fallbackColorSeed,
  onCancel,
  onSave,
}) => {
  const intl = useIntl();
  const lightOrDark = classifyLightOrDark(useResolvedTheme());
  const [expectedVersion] = useState(character.version);
  const [expectedScopeVersion] = useState(character.scopeVersion);
  const form = useForm<CharacterEditValues>({
    defaultValues: {
      name: character.name,
      key: character.key,
      aliases: character.aliases.map((value) => ({ value, originalValue: value })),
      description: character.description,
      color: character.color,
      accessPolicy: character.accessPolicy,
      accessChannelId: character.accessChannelId,
    },
    mode: 'onChange',
  });
  const {
    control,
    register,
    handleSubmit,
    clearErrors,
    setError,
    formState: { errors, isSubmitting, isValid, isValidating },
  } = form;
  const {
    field: colorField,
    fieldState: { error: colorError },
  } = useController({
    control,
    name: 'color',
    rules: {
      validate: (value) =>
        isGameColor(value.trim()) ||
        intl.formatMessage({ defaultMessage: 'Use a valid color value.' }),
    },
  });
  const { field: accessPolicyField } = useController({ control, name: 'accessPolicy' });
  const { field: accessChannelIdField } = useController({ control, name: 'accessChannelId' });
  const [colorText, setColorText] = useState(() => {
    const effectiveColor =
      character.color === '' && fallbackColor != null ? fallbackColor : character.color;
    const effectiveSeed =
      character.color === '' && fallbackColorSeed != null ? fallbackColorSeed : character.id;
    return computeColors(effectiveSeed, parseGameColor(effectiveColor))[lightOrDark];
  });
  const [mutationError, setMutationError] = useState<string | null>(null);
  const {
    channels,
    isLoading: accessOptionsLoading,
    canUseAccess,
  } = useCharacterAccessOptions(character);
  const invalidAccess =
    !accessOptionsLoading && !canUseAccess(accessPolicyField.value, accessChannelIdField.value);
  const identifierConflict = errors.root?.identifierConflict?.message;
  const staleError = errors.root?.stale?.message;
  const disabled = isSubmitting;
  const cannotSubmit =
    disabled ||
    !isValid ||
    isValidating ||
    accessOptionsLoading ||
    invalidAccess ||
    identifierConflict != null ||
    staleError != null;

  const clearServerError = () => setMutationError(null);
  const clearIdentifierConflict = () => {
    setMutationError(null);
    clearErrors('root.identifierConflict');
  };

  const nameRegistration = register('name', {
    validate: {
      required: (value) =>
        value.trim() !== '' ||
        intl.formatMessage({ defaultMessage: 'Character name is required.' }),
      maxLength: (value) =>
        Array.from(value.trim()).length <= MAX_CHARACTER_NAME_LENGTH ||
        intl.formatMessage(
          { defaultMessage: 'Character name must be at most {maxLength} characters.' },
          { maxLength: MAX_CHARACTER_NAME_LENGTH },
        ),
    },
  });
  const descriptionRegistration = register('description', {
    validate: (value) =>
      Array.from(value.trim()).length <= MAX_CHARACTER_DESCRIPTION_LENGTH ||
      intl.formatMessage(
        { defaultMessage: 'Description must be at most {maxLength} characters.' },
        { maxLength: MAX_CHARACTER_DESCRIPTION_LENGTH },
      ),
  });

  const submit = handleSubmit(async (values) => {
    setMutationError(null);
    try {
      await onSave({
        expectedVersion,
        expectedScopeVersion,
        name: values.name.trim(),
        key: values.key.trim(),
        aliases: values.aliases.map(({ value }) => value.trim()).filter((alias) => alias !== ''),
        description: values.description.trim(),
        color: values.color.trim(),
        accessPolicy: values.accessPolicy,
        accessChannelId: values.accessChannelId,
      });
      onCancel();
    } catch (cause) {
      if (cause instanceof CharacterIdentifierConflictError) {
        setError('root.identifierConflict', {
          type: 'server',
          message: intl.formatMessage({
            defaultMessage: 'This character identifier is already in use.',
          }),
        });
      } else if (cause instanceof CharacterStaleError) {
        setError('root.stale', { type: 'server', message: cause.message });
      } else {
        setMutationError(
          cause instanceof Error
            ? cause.message
            : intl.formatMessage({ defaultMessage: 'Failed to update character' }),
        );
      }
    }
  });

  return (
    <FormProvider {...form}>
      <form
        onSubmit={(event) => {
          void submit(event);
        }}
      >
        <div className="p-pane space-y-5">
          <section className="space-y-3">
            <h3 className="text-text-secondary text-sm font-medium">
              <FormattedMessage defaultMessage="Basic information" />
            </h3>
            <div className="grid gap-3 @md:grid-cols-2">
              <label className="flex min-w-0 flex-col gap-1">
                <span className="text-text-secondary text-sm">
                  <FormattedMessage defaultMessage="Character name" />
                </span>
                <TextInput
                  {...nameRegistration}
                  disabled={disabled}
                  variant={errors.name == null ? 'normal' : 'error'}
                  onChange={(event) => {
                    clearServerError();
                    void nameRegistration.onChange(event);
                  }}
                  autoFocus
                />
                {errors.name?.message != null && (
                  <span className="text-state-danger-text text-xs">{errors.name.message}</span>
                )}
              </label>
              <CharacterIdentifierFields
                character={character}
                disabled={disabled}
                identifierConflict={identifierConflict}
                onIdentifierChange={clearIdentifierConflict}
              />
            </div>
            <label className="flex flex-col gap-1">
              <span className="text-text-secondary text-sm">
                <FormattedMessage defaultMessage="Description" />
              </span>
              <TextArea
                {...descriptionRegistration}
                disabled={disabled}
                variant={errors.description == null ? 'normal' : 'error'}
                onChange={(event) => {
                  clearServerError();
                  void descriptionRegistration.onChange(event);
                }}
                rows={4}
              />
              {errors.description?.message != null && (
                <span className="text-state-danger-text text-xs">{errors.description.message}</span>
              )}
            </label>
            <div className="flex flex-col gap-1">
              <span className="text-text-secondary text-sm">
                <FormattedMessage defaultMessage="Color" />
              </span>
              <ColorEditor
                color={colorField.value}
                colorSeed={character.id}
                fallbackColor={fallbackColor}
                fallbackColorSeed={fallbackColorSeed}
                textValue={colorText}
                onTextChange={(value) => {
                  clearServerError();
                  colorField.onChange(value);
                  setColorText(value);
                }}
                onSelectColor={(value) => {
                  clearServerError();
                  colorField.onChange(value);
                  setColorText(
                    parseHexColor(value)?.toUpperCase() ??
                      computeColors(character.id, parseGameColor(value))[lightOrDark],
                  );
                }}
                disabled={disabled}
              />
              {colorError?.message != null && (
                <span className="text-state-danger-text text-xs">{colorError.message}</span>
              )}
              {colorField.value === '' && fallbackColor != null && (
                <span className="text-text-muted text-xs">
                  <FormattedMessage defaultMessage="Inherits your default color." />
                </span>
              )}
            </div>
          </section>
          <div>
            <CharacterAccessFields
              channels={channels}
              isLoading={accessOptionsLoading}
              accessPolicy={accessPolicyField.value}
              accessChannelId={accessChannelIdField.value}
              disabled={disabled}
              canUseAccess={canUseAccess}
              onAccessPolicyChange={(value) => {
                clearServerError();
                accessPolicyField.onChange(value);
              }}
              onAccessChannelIdChange={(value) => {
                clearServerError();
                accessChannelIdField.onChange(value);
              }}
            />
            {invalidAccess && (
              <span className="text-state-danger-text mt-2 block text-xs">
                <FormattedMessage defaultMessage="You cannot edit a character with this permission and access scope." />
              </span>
            )}
          </div>
          {staleError != null && (
            <div className="border-state-warning-border bg-state-warning-bg text-state-warning-text space-y-2 rounded border p-3 text-sm">
              <div>{staleError}</div>
              <Button type="button" small onClick={onCancel}>
                <FormattedMessage defaultMessage="Close editor" />
              </Button>
            </div>
          )}
          {mutationError != null && (
            <div className="text-state-danger-text text-sm">{mutationError}</div>
          )}
        </div>
        <PaneFooterBox>
          <Button type="button" onClick={onCancel} disabled={disabled}>
            <FormattedMessage defaultMessage="Cancel" />
          </Button>
          <Button type="submit" variant="primary" disabled={cannotSubmit}>
            <FormattedMessage defaultMessage="Save Changes" />
          </Button>
        </PaneFooterBox>
      </form>
    </FormProvider>
  );
};
