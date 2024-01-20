import { useAtom } from 'jotai';
import { FC } from 'react';
import { TextInput } from '@boluo/ui/TextInput';
import { useComposeAtom } from '../../hooks/useComposeAtom';

interface Props {
  id?: string;
  placeholder?: string;
  className?: string;
  disabled: boolean;
}

export const NameInput: FC<Props> = ({ id, className, placeholder, disabled }) => {
  const composeAtom = useComposeAtom();
  const [compose, dispatch] = useAtom(composeAtom);
  return (
    <TextInput
      id={id}
      disabled={disabled}
      placeholder={placeholder}
      value={compose.inputedName}
      className={className}
      onChange={(e) => dispatch({ type: 'setInputedName', payload: { inputedName: e.target.value } })}
    />
  );
};
