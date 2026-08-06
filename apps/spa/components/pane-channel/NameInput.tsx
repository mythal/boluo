import { useAtomValue, useSetAtom } from 'jotai';
import { type FC, useState } from 'react';
import { TextInput } from '@boluo/ui/TextInput';
import { ButtonInline } from '@boluo/ui/ButtonInline';
import { useChannelAtoms } from '../../hooks/useChannelAtoms';
import { useEditChannelCharacterName } from '../../hooks/useEditChannelCharacterName';
import { FormattedMessage } from 'react-intl';
import { useSWRConfig } from 'swr';

export const NameEditInput: FC<{
  id?: string;
  channelId: string;
  setInGame?: boolean;
  defaultName: string;
  characterId: string | null;
}> = ({ id, channelId, setInGame = false, defaultName, characterId }) => {
  const { composeAtom, characterNameAtom } = useChannelAtoms();
  const characterName = useAtomValue(characterNameAtom);
  const { trigger: setDefault, isMutating, error } = useEditChannelCharacterName(channelId);
  const { mutate } = useSWRConfig();
  const [localName, setLocalName] = useState(characterName);
  const [prevCharacterName, setPrevCharacterName] = useState(characterName);
  const dispatch = useSetAtom(composeAtom);
  if (prevCharacterName !== characterName) {
    setPrevCharacterName(characterName);
    setLocalName(characterName);
  }
  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const next = e.target.value;
    setLocalName(next);
    dispatch({ type: 'setCharacterName', payload: { name: next, setInGame } });
  };
  const handleSetDefault = async () => {
    const name = characterName.trim();
    if (name === '') return;
    try {
      await setDefault({ characterName: name, characterId: null });
      await mutate(['/channels/members', channelId]);
      dispatch({ type: 'setCharacterName', payload: { name: '', setInGame } });
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
          placeholder={defaultName}
          onChange={handleChange}
        />
      </div>
      <div className="text-text-muted flex items-center justify-end gap-1 pb-2 text-xs">
        <span>
          {characterName.trim() !== '' || (characterId == null && defaultName.trim() !== '') ? (
            <FormattedMessage defaultMessage="As this name" />
          ) : characterId != null ? (
            <FormattedMessage defaultMessage="As character" />
          ) : (
            <FormattedMessage defaultMessage="Not set" />
          )}
        </span>
        {characterName.trim() !== '' && (
          <ButtonInline
            disabled={isMutating}
            onClick={() => void handleSetDefault()}
            className="text-xs"
          >
            <FormattedMessage defaultMessage="Set Default" />
          </ButtonInline>
        )}
        {error && <span className="text-state-danger-text">{error.code}</span>}
      </div>
    </>
  );
};
