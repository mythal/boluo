import { useAtom } from 'jotai';
import { FC, useMemo } from 'react';
import { TextInput } from 'ui';
import { useChannelId } from '../../hooks/useChannelId';
import { makeComposeAction } from '../../state/actions/compose';
import { composeAtomFamily } from '../../state/atoms/compose';

interface Props {
  className?: string;
}

export const NameInput: FC<Props> = ({ className }) => {
  const channelId = useChannelId();
  const composeAtom = useMemo(() => composeAtomFamily(channelId), [channelId]);
  const [compose, dispatch] = useAtom(composeAtom);
  return (
    <TextInput
      value={compose.inputedName}
      className={className}
      onChange={(e) => dispatch(makeComposeAction('setInputedName', { inputedName: e.target.value.trim() }))}
    />
  );
};
