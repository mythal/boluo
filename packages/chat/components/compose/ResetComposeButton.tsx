import { X } from 'icons';
import { useSetAtom } from 'jotai';
import { FC } from 'react';
import { Button } from 'ui/Button';
import { useComposeAtom } from '../../hooks/useComposeAtom';

interface Props {}

export const ResetComposeButton: FC<Props> = () => {
  const composeAtom = useComposeAtom();
  const dispatch = useSetAtom(composeAtom);
  const reset = () => {
    dispatch({ type: 'reset', payload: {} });
  };
  return (
    <Button onClick={reset}>
      <X />
    </Button>
  );
};
