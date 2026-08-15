import type { AccessPolicy, ApiError, Character } from '@boluo/api';
import { get } from '@boluo/api-browser';
import { computeColors, isGameColor, parseGameColor, parseHexColor } from '@boluo/color';
import Plus from '@boluo/icons/Plus';
import Trash from '@boluo/icons/Trash';
import { classifyLightOrDark } from '@boluo/theme';
import { Button } from '@boluo/ui/Button';
import { TextArea, TextInput } from '@boluo/ui/TextInput';
import { useDeferredValue, useRef, useState, type FC } from 'react';
import { FormattedMessage, useIntl } from 'react-intl';
import { useResolvedTheme } from '../../hooks/useResolvedTheme';
import { ColorEditor } from '../ColorEditor';
import { PaneFooterBox } from '../PaneFooterBox';
import { isValidEntryKey } from './entry-metadata';
import { CharacterAccessFields } from './CharacterAccessFields';
import useSWR from 'swr';
import { unwrap } from '@boluo/utils/result';
import { useCharacterAccessOptions } from './character-permissions';

export interface CharacterEditDraft {
  expectedVersion: string;
  expectedScopeVersion: string;
  name: string;
  key: string;
  aliases: string[];
  description: string;
  color: string;
  accessPolicy: AccessPolicy;
  accessChannelId: string | null;
}

const MAX_ALIASES = 4;
type IdentifierAvailabilityKey = readonly ['/characters/check_identifier', string, string, string];

interface AliasDraft {
  id: number;
  value: string;
}

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
  const [name, setName] = useState(character.name);
  const [key, setKey] = useState(character.key);
  const [aliases, setAliases] = useState<AliasDraft[]>(() =>
    character.aliases.map((value, id) => ({ id, value })),
  );
  const nextAliasId = useRef(character.aliases.length);
  const [description, setDescription] = useState(character.description);
  const [color, setColor] = useState(character.color);
  const [accessPolicy, setAccessPolicy] = useState(character.accessPolicy);
  const [accessChannelId, setAccessChannelId] = useState(character.accessChannelId);
  const [colorText, setColorText] = useState(() => {
    const effectiveColor = character.color === '' && fallbackColor != null ? fallbackColor : color;
    const effectiveSeed =
      character.color === '' && fallbackColorSeed != null ? fallbackColorSeed : character.id;
    return computeColors(effectiveSeed, parseGameColor(effectiveColor))[lightOrDark];
  });
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const disabled = isSaving;
  const invalidColor = !isGameColor(color.trim());
  const invalidAliasIds = new Set(
    aliases
      .filter((alias) => alias.value.trim() !== '' && !isValidEntryKey(alias.value))
      .map((alias) => alias.id),
  );
  const hasInvalidAlias = invalidAliasIds.size > 0;
  const trimmedKey = key.trim();
  const invalidKey = !isValidEntryKey(trimmedKey);
  const deferredKey = useDeferredValue(trimmedKey);
  const identifierAvailabilityKey: IdentifierAvailabilityKey | null =
    !invalidKey && deferredKey !== character.key
      ? ['/characters/check_identifier', character.spaceId, character.id, deferredKey]
      : null;
  const {
    data: keyAvailable,
    error: keyAvailabilityError,
    isValidating: isValidatingKey,
  } = useSWR<boolean, ApiError, IdentifierAvailabilityKey | null>(
    identifierAvailabilityKey,
    ([path, spaceId, characterId, identifier]) =>
      get(path, { spaceId, characterId, identifier }).then(unwrap),
  );
  const keyTaken = deferredKey === trimmedKey && keyAvailable === false;
  const keyCheckFailed = deferredKey === trimmedKey && keyAvailabilityError != null;
  const keyCheckPending =
    !invalidKey &&
    trimmedKey !== character.key &&
    !keyCheckFailed &&
    (deferredKey !== trimmedKey || keyAvailable == null || isValidatingKey);
  const {
    channels,
    isLoading: accessOptionsLoading,
    canUseAccess,
  } = useCharacterAccessOptions(character);
  const invalidAccess = !accessOptionsLoading && !canUseAccess(accessPolicy, accessChannelId);
  const cannotSubmit =
    disabled ||
    name.trim() === '' ||
    invalidColor ||
    hasInvalidAlias ||
    invalidKey ||
    keyTaken ||
    keyCheckPending ||
    keyCheckFailed ||
    accessOptionsLoading ||
    invalidAccess;

  const save = async (action: () => Promise<void>) => {
    setIsSaving(true);
    setError(null);
    try {
      await action();
      onCancel();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Failed to update character');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <form
      onSubmit={(event) => {
        event.preventDefault();
        if (cannotSubmit) return;
        void save(() =>
          onSave({
            expectedVersion,
            expectedScopeVersion,
            name: name.trim(),
            key: trimmedKey,
            aliases: aliases.map((alias) => alias.value.trim()).filter((alias) => alias !== ''),
            description: description.trim(),
            color: color.trim(),
            accessPolicy,
            accessChannelId,
          }),
        );
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
              <TextInput value={name} onChange={(event) => setName(event.target.value)} autoFocus />
            </label>
            <label className="flex min-w-0 flex-col gap-1">
              <span className="text-text-secondary text-sm">
                <FormattedMessage defaultMessage="Character key" />
              </span>
              <TextInput
                value={key}
                disabled={disabled}
                variant={invalidKey || keyTaken || keyCheckFailed ? 'error' : 'normal'}
                onChange={(event) => setKey(event.target.value)}
              />
              <span className="text-text-muted text-xs">
                <FormattedMessage defaultMessage="The primary identifier used by commands." />
              </span>
              {invalidKey && (
                <span className="text-state-danger-text text-xs">
                  <FormattedMessage defaultMessage="Use 1–64 letters, numbers, emoji, or supported punctuation, without spaces." />
                </span>
              )}
              {keyTaken && (
                <span className="text-state-danger-text text-xs">
                  <FormattedMessage defaultMessage="This character identifier is already in use." />
                </span>
              )}
              {keyCheckPending && (
                <span className="text-text-muted text-xs">
                  <FormattedMessage defaultMessage="Checking identifier availability…" />
                </span>
              )}
              {keyCheckFailed && (
                <span className="text-state-danger-text text-xs">
                  <FormattedMessage defaultMessage="Could not check identifier availability. Try again." />
                </span>
              )}
            </label>
          </div>
          <div className="flex flex-col gap-1">
            <span className="text-text-secondary text-sm">
              <FormattedMessage defaultMessage="Aliases" />
            </span>
            <span className="text-text-muted text-xs">
              <FormattedMessage defaultMessage="Identifiers used to refer to this character." />
            </span>
            {aliases.length > 0 && (
              <div className="grid gap-2 @md:grid-cols-2">
                {aliases.map((alias, index) => (
                  <div className="min-w-0 space-y-1" key={alias.id}>
                    <div className="flex items-stretch gap-2">
                      <TextInput
                        className="min-w-0 flex-1"
                        value={alias.value}
                        disabled={disabled}
                        variant={invalidAliasIds.has(alias.id) ? 'error' : 'normal'}
                        aria-label={intl.formatMessage(
                          { defaultMessage: 'Alias {number}' },
                          { number: index + 1 },
                        )}
                        onChange={(event) => {
                          const value = event.target.value;
                          setAliases((current) =>
                            current.map((currentAlias) =>
                              currentAlias.id === alias.id
                                ? { ...currentAlias, value }
                                : currentAlias,
                            ),
                          );
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
                        onClick={() =>
                          setAliases((current) =>
                            current.filter((currentAlias) => currentAlias.id !== alias.id),
                          )
                        }
                      >
                        <Trash />
                      </Button>
                    </div>
                    {invalidAliasIds.has(alias.id) && (
                      <span className="text-state-danger-text block text-xs">
                        <FormattedMessage defaultMessage="Use 1–64 letters, numbers, emoji, or supported punctuation, without spaces." />
                      </span>
                    )}
                  </div>
                ))}
              </div>
            )}
            <div>
              <Button
                small
                disabled={disabled || aliases.length >= MAX_ALIASES}
                onClick={() => {
                  const id = nextAliasId.current;
                  nextAliasId.current += 1;
                  setAliases((current) => [...current, { id, value: '' }]);
                }}
              >
                <Plus />
                <FormattedMessage defaultMessage="Add alias" />
              </Button>
            </div>
          </div>
          <label className="flex flex-col gap-1">
            <span className="text-text-secondary text-sm">
              <FormattedMessage defaultMessage="Description" />
            </span>
            <TextArea
              value={description}
              onChange={(event) => setDescription(event.target.value)}
              rows={4}
            />
          </label>
          <div className="flex flex-col gap-1">
            <span className="text-text-secondary text-sm">
              <FormattedMessage defaultMessage="Color" />
            </span>
            <ColorEditor
              color={color}
              colorSeed={character.id}
              fallbackColor={fallbackColor}
              fallbackColorSeed={fallbackColorSeed}
              textValue={colorText}
              onTextChange={(value) => {
                setColor(value);
                setColorText(value);
              }}
              onSelectColor={(value) => {
                setColor(value);
                setColorText(
                  parseHexColor(value)?.toUpperCase() ??
                    computeColors(character.id, parseGameColor(value))[lightOrDark],
                );
              }}
              disabled={disabled}
            />
            {invalidColor && (
              <span className="text-state-danger-text text-xs">
                <FormattedMessage defaultMessage="Use a valid color value." />
              </span>
            )}
            {color === '' && fallbackColor != null && (
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
            accessPolicy={accessPolicy}
            accessChannelId={accessChannelId}
            disabled={disabled}
            canUseAccess={canUseAccess}
            onAccessPolicyChange={setAccessPolicy}
            onAccessChannelIdChange={setAccessChannelId}
          />
          {invalidAccess && (
            <span className="text-state-danger-text mt-2 block text-xs">
              <FormattedMessage defaultMessage="You cannot edit a character with this permission and access scope." />
            </span>
          )}
        </div>
        {error && <div className="text-state-danger-text text-sm">{error}</div>}
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
  );
};
