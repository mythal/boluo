import type { Character } from '@boluo/api';
import { computeColors, isGameColor, parseGameColor, parseHexColor } from '@boluo/color';
import Plus from '@boluo/icons/Plus';
import Trash from '@boluo/icons/Trash';
import { classifyLightOrDark } from '@boluo/theme';
import { Button } from '@boluo/ui/Button';
import { TextArea, TextInput } from '@boluo/ui/TextInput';
import { useRef, useState, type FC } from 'react';
import { FormattedMessage, useIntl } from 'react-intl';
import { useResolvedTheme } from '../../hooks/useResolvedTheme';
import { ColorEditor } from '../ColorEditor';
import { PaneFooterBox } from '../PaneFooterBox';
import { CharacterArchiveButton } from './CharacterArchiveButton';
import { isValidEntryKey } from './entry-metadata';

export interface CharacterEditDraft {
  expectedVersion: string;
  expectedScopeVersion: string;
  name: string;
  aliases: string[];
  description: string;
  color: string;
}

const MAX_ALIASES = 4;

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
  onSetArchived: (archived: boolean) => Promise<void>;
}

export const CharacterEditForm: FC<Props> = ({
  character,
  fallbackColor,
  fallbackColorSeed,
  onCancel,
  onSave,
  onSetArchived,
}) => {
  const intl = useIntl();
  const lightOrDark = classifyLightOrDark(useResolvedTheme());
  const [expectedVersion] = useState(character.version);
  const [expectedScopeVersion] = useState(character.scopeVersion);
  const [name, setName] = useState(character.name);
  const [aliases, setAliases] = useState<AliasDraft[]>(() =>
    character.aliases.map((value, id) => ({ id, value })),
  );
  const nextAliasId = useRef(character.aliases.length);
  const [description, setDescription] = useState(character.description);
  const [color, setColor] = useState(character.color);
  const [colorText, setColorText] = useState(() => {
    const effectiveColor = character.color === '' && fallbackColor != null ? fallbackColor : color;
    const effectiveSeed =
      character.color === '' && fallbackColorSeed != null ? fallbackColorSeed : character.id;
    return computeColors(effectiveSeed, parseGameColor(effectiveColor))[lightOrDark];
  });
  const [operation, setOperation] = useState<'SAVE' | 'ARCHIVE' | null>(null);
  const [error, setError] = useState<string | null>(null);
  const disabled = operation != null;
  const invalidColor = !isGameColor(color.trim());
  const invalidAliasIds = new Set(
    aliases
      .filter((alias) => alias.value.trim() !== '' && !isValidEntryKey(alias.value))
      .map((alias) => alias.id),
  );
  const hasInvalidAlias = invalidAliasIds.size > 0;

  const run = async (nextOperation: 'SAVE' | 'ARCHIVE', action: () => Promise<void>) => {
    setOperation(nextOperation);
    setError(null);
    try {
      await action();
      onCancel();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Failed to update character');
    } finally {
      setOperation(null);
    }
  };

  return (
    <form
      onSubmit={(event) => {
        event.preventDefault();
        if (name.trim() === '' || invalidColor || hasInvalidAlias) return;
        void run('SAVE', () =>
          onSave({
            expectedVersion,
            expectedScopeVersion,
            name: name.trim(),
            aliases: aliases.map((alias) => alias.value.trim()).filter((alias) => alias !== ''),
            description: description.trim(),
            color: color.trim(),
          }),
        );
      }}
    >
      <div className="p-pane space-y-3">
        <label className="flex flex-col gap-1">
          <span className="text-text-secondary text-sm">
            <FormattedMessage defaultMessage="Character name" />
          </span>
          <TextInput value={name} onChange={(event) => setName(event.target.value)} autoFocus />
        </label>
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
          </div>{' '}
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
          <ColorEditor
            title={<FormattedMessage defaultMessage="Color" />}
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
        {error && <div className="text-state-danger-text text-sm">{error}</div>}
      </div>
      <PaneFooterBox>
        <Button type="button" onClick={onCancel} disabled={disabled}>
          <FormattedMessage defaultMessage="Cancel" />
        </Button>
        <CharacterArchiveButton
          character={character}
          disabled={disabled}
          onSetArchived={(archived) => void run('ARCHIVE', () => onSetArchived(archived))}
        />
        <Button
          type="submit"
          variant="primary"
          disabled={disabled || name.trim() === '' || invalidColor || hasInvalidAlias}
        >
          <FormattedMessage defaultMessage="Save Changes" />
        </Button>
      </PaneFooterBox>
    </form>
  );
};
