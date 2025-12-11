import { useAtomValue, useSetAtom } from 'jotai';
import { type FC, useEffect, useState } from 'react';
import { TextInput } from '@boluo/ui/TextInput';
import { useChannelAtoms } from '../../hooks/useChannelAtoms';
import { Button } from '@boluo/ui/Button';
import { FormattedMessage } from 'react-intl';
import { useEditChannelCharacterName } from '../../hooks/useEditChannelCharacterName';

const AsDefaultButton: FC<{ channelId: string; characterName: string; disabled: boolean }> = ({
  channelId,
  disabled,
  characterName,
}) => {
  const { trigger, isMutating } = useEditChannelCharacterName(channelId);
  const handleClick = () => {
    void trigger(
      { characterName },
      {
        rollbackOnError: true,
      },
    );
  };
  return (
    <div className="text-right">
      <Button small disabled={disabled || isMutating} onClick={handleClick}>
        <FormattedMessage defaultMessage="As Default" />
      </Button>
    </div>
  );
};

export const NameEditInput: FC<{
  id?: string;
  channelId: string;
  setInGame?: boolean;
  defaultName: string;
}> = ({ id, setInGame = false, defaultName, channelId }) => {
  const { composeAtom, characterNameAtom } = useChannelAtoms();
  const characterName = useAtomValue(characterNameAtom);
  const [localName, setLocalName] = useState(characterName);
  const dispatch = useSetAtom(composeAtom);
  useEffect(() => {
    setLocalName(characterName);
  }, [characterName]);
  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const next = e.target.value;
    setLocalName(next);
    dispatch({ type: 'setCharacterName', payload: { name: next, setInGame } });
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
      <div className="text-right">
        <AsDefaultButton
          channelId={channelId}
          characterName={localName}
          disabled={!localName || localName === defaultName}
        />
      </div>
    </>
  );
};
