import { Dice } from 'icons';
import { useSetAtom } from 'jotai';
import { FC } from 'react';
import { FormattedMessage } from 'react-intl';
import { Button } from 'ui/Button';
import { useComposeAtom } from '../../hooks/useComposeAtom';

interface Props {
}

export const AddDiceButton: FC<Props> = () => {
  const composeAtom = useComposeAtom();
  const dispatch = useSetAtom(composeAtom);
  const handleAddDice = () => dispatch({ type: 'addDice', payload: {} });
  return (
    <Button onClick={handleAddDice}>
      <Dice />
      <span className="hidden @md:inline">
        <FormattedMessage defaultMessage="Add Dice" />
      </span>
    </Button>
  );
};
