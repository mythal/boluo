import { useAtom } from 'jotai';
import { FC } from 'react';
import { TextInput } from 'ui/TextInput';
import { useComposeAtom } from '../../hooks/useComposeAtom';

interface Props {
  className?: string;
}

export const NameInput: FC<Props> = ({ className }) => {
  const composeAtom = useComposeAtom();
  const [compose, dispatch] = useAtom(composeAtom);
  return (
    <TextInput
      value={compose.inputedName}
      className={className}
      onChange={(e) => dispatch({ type: 'setInputedName', payload: { inputedName: e.target.value } })}
    />
  );
};
