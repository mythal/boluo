import type { Character } from '@boluo/api';
import { computeColors, isGameColor, parseGameColor, parseHexColor } from '@boluo/color';
import { classifyLightOrDark } from '@boluo/theme';
import { Button } from '@boluo/ui/Button';
import { TextArea, TextInput } from '@boluo/ui/TextInput';
import { useState, type FC } from 'react';
import { FormattedMessage } from 'react-intl';
import { useResolvedTheme } from '../../hooks/useResolvedTheme';
import { ColorEditor } from '../ColorEditor';
import { PaneFooterBox } from '../PaneFooterBox';
import { CharacterArchiveButton } from './CharacterArchiveButton';

export interface CharacterEditDraft {
  expectedVersion: string;
  expectedScopeVersion: string;
  name: string;
  description: string;
  color: string;
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
  const lightOrDark = classifyLightOrDark(useResolvedTheme());
  const [expectedVersion] = useState(character.version);
  const [expectedScopeVersion] = useState(character.scopeVersion);
  const [name, setName] = useState(character.name);
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
        if (name.trim() === '' || invalidColor) return;
        void run('SAVE', () =>
          onSave({
            expectedVersion,
            expectedScopeVersion,
            name: name.trim(),
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
          disabled={disabled || name.trim() === '' || invalidColor}
        >
          <FormattedMessage defaultMessage="Save Changes" />
        </Button>
      </PaneFooterBox>
    </form>
  );
};
