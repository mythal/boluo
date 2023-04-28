import { X } from 'icons';
import { useSetAtom } from 'jotai';
import { FC } from 'react';
import { Button } from 'ui';
import { useComposeAtom } from '../../hooks/useComposeAtom';
import { makeComposeAction } from '../../state/compose.actions';

interface Props {}

export const CancelEditingButton: FC<Props> = () => {
  const composeAtom = useComposeAtom();
  const dispatch = useSetAtom(composeAtom);
  const reset = () => {
    dispatch(makeComposeAction('reset', {}));
  };
  return (
    <Button type="button" data-small onClick={reset}>
      <X />
    </Button>
  );
};
