import { Dice } from '@boluo/icons';
import { useSetAtom } from 'jotai';
import { FC } from 'react';
import { useIntl } from 'react-intl';
import { useComposeAtom } from '../../hooks/useComposeAtom';
import { InComposeButton } from './InComposeButton';
import { useDefaultRollCommand } from '../../hooks/useDefaultRollCommand';

interface Props {}

export const AddDiceButton: FC<Props> = () => {
  const defaultRollCommand = useDefaultRollCommand();
  const composeAtom = useComposeAtom();
  const dispatch = useSetAtom(composeAtom);
  const intl = useIntl();
  const handleAddDice = () =>
    dispatch({
      type: 'addDice',
      payload: {
        defaultRollCommand,
      },
    });
  const title = intl.formatMessage({ defaultMessage: 'Add Dice' });
  return (
    <InComposeButton onClick={handleAddDice} title={title}>
      <Dice />
    </InComposeButton>
  );
};
