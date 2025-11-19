import { useAtomValue, useSetAtom } from 'jotai';
import { type FC, useMemo } from 'react';
import { TextInput } from '@boluo/ui/TextInput';
import { useComposeAtom } from '../../hooks/useComposeAtom';
import { selectAtom } from 'jotai/utils';
import { Button } from '@boluo/ui/Button';
import { FormattedMessage } from 'react-intl';
import { useEditChannelCharacterName } from '../../hooks/useEditChannelCharacterName';

const AsDefaultButton: FC<{ channelId: string; inputedName: string; disabled: boolean }> = ({
  channelId,
  disabled,
  inputedName,
}) => {
  const { trigger, isMutating } = useEditChannelCharacterName(channelId);
  const handleClick = () => {
    void trigger(
      { characterName: inputedName },
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
  const composeAtom = useComposeAtom();
  const inputedNameAtom = useMemo(
    () => selectAtom(composeAtom, ({ inputedName }) => inputedName),
    [composeAtom],
  );
  const inputedName = useAtomValue(inputedNameAtom);
  const dispatch = useSetAtom(composeAtom);
  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    dispatch({ type: 'setInputedName', payload: { inputedName: e.target.value, setInGame } });
  };

  return (
    <>
      <div>
        <TextInput
          id={id}
          value={inputedName}
          className="w-full"
          placeholder={defaultName}
          onChange={handleChange}
        />
      </div>
      <div className="text-right">
        <AsDefaultButton
          channelId={channelId}
          inputedName={inputedName}
          disabled={!inputedName || inputedName === defaultName}
        />
      </div>
    </>
  );
};
