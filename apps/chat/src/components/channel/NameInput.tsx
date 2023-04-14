import { useAtom } from 'jotai';
import { FC } from 'react';
import { TextInput } from 'ui';
import { useChannelId } from '../../hooks/useChannelId';
import { useComposeAtom } from '../../hooks/useComposeAtom';
import { makeComposeAction } from '../../state/actions/compose';

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
      onChange={(e) => dispatch(makeComposeAction('setInputedName', { inputedName: e.target.value.trim() }))}
    />
  );
};
