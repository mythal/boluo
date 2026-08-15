import { useAtomValue, useSetAtom } from 'jotai';
import { type FC, useState } from 'react';
import { TextInput } from '@boluo/ui/TextInput';
import { ButtonInline } from '@boluo/ui/ButtonInline';
import { useChannelAtoms } from '../../hooks/useChannelAtoms';
import { useEditChannelCharacterName } from '../../hooks/useEditChannelCharacterName';
import { FormattedMessage } from 'react-intl';
import { useSWRConfig } from 'swr';
import { usePortrayableCharacters } from '../../hooks/usePortrayableCharacters';

export const NameEditInput: FC<{
  id?: string;
  channelId: string;
  spaceId: string;
  setInGame?: boolean;
  defaultName: string;
  characterId: string | null;
}> = ({ id, channelId, spaceId, setInGame = false, defaultName, characterId }) => {
  const { composeAtom, asTargetAtom, asTargetTextAtom } = useChannelAtoms();
  const asTarget = useAtomValue(asTargetAtom);
  const targetText = useAtomValue(asTargetTextAtom);
  const { resolve } = usePortrayableCharacters(spaceId);
  const referencedCharacter =
    asTarget?.type === 'CharacterReference' ? resolve(asTarget.identifier) : null;
  const hasResolvedCharacter = referencedCharacter?.status === 'Found';
  const resolvedCharacter = hasResolvedCharacter ? referencedCharacter.character : null;
  const usesDefaultCharacter = asTarget?.type === 'DefaultCharacter';
  const displayValue = hasResolvedCharacter || usesDefaultCharacter ? '' : targetText;
  const placeholder = hasResolvedCharacter ? referencedCharacter.character.name : defaultName;
  const { trigger: setDefault, isMutating, error } = useEditChannelCharacterName(channelId);
  const { mutate } = useSWRConfig();
  const [localName, setLocalName] = useState(displayValue);
  const [previousDisplayValue, setPreviousDisplayValue] = useState(displayValue);
  const hasTemporaryName = asTarget?.type === 'TemporaryName';
  const hasCharacterReference =
    asTarget?.type === 'CharacterReference' || asTarget?.type === 'DefaultCharacter';
  const displaysTemporaryName =
    hasTemporaryName ||
    (characterId == null && defaultName.trim() !== '' && !hasCharacterReference);
  const statusCharacterName =
    resolvedCharacter?.name ?? (characterId != null ? defaultName : undefined);
  const dispatch = useSetAtom(composeAtom);
  if (previousDisplayValue !== displayValue) {
    setPreviousDisplayValue(displayValue);
    setLocalName(displayValue);
  }
  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const next = e.target.value;
    setLocalName(next);
    dispatch({ type: 'setAsTargetText', payload: { text: next, setInGame } });
  };
  const handleSetDefault = async () => {
    const name =
      asTarget?.type === 'TemporaryName' ? asTarget.name.trim() : (resolvedCharacter?.name ?? '');
    if (name === '') return;
    try {
      await setDefault({ characterName: name, characterId: resolvedCharacter?.id ?? null });
      await mutate(['/channels/members', channelId]);
      dispatch({ type: 'setAsTargetText', payload: { text: '', setInGame } });
    } catch {
      // The mutation error is rendered next to the status label.
    }
  };

  return (
    <>
      <div>
        <TextInput
          id={id}
          value={localName}
          className="w-full"
          placeholder={placeholder}
          onChange={handleChange}
        />
      </div>
      <div className="text-text-muted flex h-7 items-center justify-end gap-1 pt-1 pb-2 text-xs">
        <span className="min-w-0 truncate text-right" title={statusCharacterName}>
          {displaysTemporaryName ? (
            <FormattedMessage defaultMessage="As this name" />
          ) : resolvedCharacter != null ? (
            <FormattedMessage
              defaultMessage="As character “{name}”"
              values={{ name: resolvedCharacter.name }}
            />
          ) : characterId != null ? (
            <FormattedMessage
              defaultMessage="As character “{name}”"
              values={{ name: defaultName }}
            />
          ) : hasCharacterReference ? (
            <FormattedMessage defaultMessage="As character" />
          ) : (
            <FormattedMessage defaultMessage="Not set" />
          )}
        </span>
        {(hasTemporaryName ||
          (resolvedCharacter != null && resolvedCharacter.id !== characterId)) && (
          <ButtonInline
            disabled={isMutating}
            onClick={() => void handleSetDefault()}
            className="shrink-0 text-xs"
          >
            <FormattedMessage defaultMessage="Set Default" />
          </ButtonInline>
        )}
        {error && <span className="text-state-danger-text">{error.code}</span>}
      </div>
    </>
  );
};
