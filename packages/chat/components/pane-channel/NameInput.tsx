import { useAtomValue, useSetAtom } from 'jotai';
import { FC } from 'react';
import { TextInput } from '@boluo/ui/TextInput';
import { useChannelAtoms } from '../../hooks/useChannelAtoms';
import { useMe } from '@boluo/common';

interface Props {
  id?: string;
  defaultCharacterName: string;
  className?: string;
  disabled: boolean;
}

export const NameInput: FC<Props> = ({ id, className, defaultCharacterName, disabled }) => {
  const me = useMe();
  const { inGameAtom, composeAtom, inputedNameAtom } = useChannelAtoms();
  const inputedName = useAtomValue(inputedNameAtom);
  const dispatch = useSetAtom(composeAtom);
  const inGame = useAtomValue(inGameAtom);
  const nickname = me != null && me !== 'LOADING' ? me.user.nickname : '';
  return (
    <TextInput
      id={id}
      disabled={disabled}
      placeholder={defaultCharacterName}
      value={inGame ? inputedName : nickname}
      className={className}
      onChange={(e) => dispatch({ type: 'setInputedName', payload: { inputedName: e.target.value } })}
    />
  );
};
