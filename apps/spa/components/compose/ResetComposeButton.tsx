import { X } from '@boluo/icons';
import { useSetAtom } from 'jotai';
import { type FC } from 'react';
import { Button } from '@boluo/ui/Button';
import { useComposeAtom } from '../../hooks/useComposeAtom';
import Icon from '@boluo/ui/Icon';

interface Props {}

export const ResetComposeButton: FC<Props> = () => {
  const composeAtom = useComposeAtom();
  const dispatch = useSetAtom(composeAtom);
  const reset = () => {
    dispatch({ type: 'reset', payload: {} });
  };
  return (
    <Button onClick={reset}>
      <Icon icon={X} />
    </Button>
  );
};
