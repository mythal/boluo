import { useAtom } from 'jotai';
import { FC } from 'react';
import { TextInput } from '@boluo/ui/TextInput';
import { useComposeAtom } from '../../hooks/useComposeAtom';

interface Props {
  id?: string;
  className?: string;
  setInGame?: boolean;
  placeholder?: string;
}

export const NameInput: FC<Props> = ({ id, className, setInGame = false, placeholder }) => {
  const composeAtom = useComposeAtom();
  const [compose, dispatch] = useAtom(composeAtom);
  return (
    <TextInput
      id={id}
      value={compose.inputedName}
      className={className}
      placeholder={placeholder}
      onChange={(e) => dispatch({ type: 'setInputedName', payload: { inputedName: e.target.value, setInGame } })}
    />
  );
};
