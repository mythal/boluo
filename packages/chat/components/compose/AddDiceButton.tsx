import { Dice } from '@boluo/icons';
import { useSetAtom } from 'jotai';
import { FC } from 'react';
import { FormattedMessage, useIntl } from 'react-intl';
import { Button } from '@boluo/ui/Button';
import { useComposeAtom } from '../../hooks/useComposeAtom';
import { InComposeButton } from './InComposeButton';

interface Props {}

export const AddDiceButton: FC<Props> = () => {
  const composeAtom = useComposeAtom();
  const dispatch = useSetAtom(composeAtom);
  const intl = useIntl();
  const handleAddDice = () => dispatch({ type: 'addDice', payload: {} });
  const title = intl.formatMessage({ defaultMessage: 'Add Dice' });
  return (
    <InComposeButton onClick={handleAddDice} title={title}>
      <Dice />
    </InComposeButton>
  );
};
