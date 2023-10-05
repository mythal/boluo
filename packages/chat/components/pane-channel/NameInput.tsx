import { useAtom } from 'jotai';
import { FC } from 'react';
import { TextInput } from 'ui/TextInput';
import { useComposeAtom } from '../../hooks/useComposeAtom';

interface Props {
  id?: string;
  className?: string;
}

export const NameInput: FC<Props> = ({ id, className }) => {
  const composeAtom = useComposeAtom();
  const [compose, dispatch] = useAtom(composeAtom);
  return (
    <TextInput
      id={id}
      value={compose.inputedName}
      className={className}
      onChange={(e) => dispatch({ type: 'setInputedName', payload: { inputedName: e.target.value } })}
    />
  );
};
