import { Dice } from 'icons';
import { useSetAtom } from 'jotai';
import { FC, useMemo } from 'react';
import { FormattedMessage } from 'react-intl';
import { Button } from 'ui/Button';
import { useChannelId } from '../../hooks/useChannelId';
import { makeComposeAction } from '../../state/actions/compose';
import { composeAtomFamily } from '../../state/atoms/compose';

interface Props {
}

export const AddDiceButton: FC<Props> = () => {
  const channelId = useChannelId();
  const composeAtom = useMemo(() => composeAtomFamily(channelId), [channelId]);
  const dispatch = useSetAtom(composeAtom);
  const handleAddDice = () => dispatch(makeComposeAction('addDice', {}));
  return (
    <Button onClick={handleAddDice}>
      <Dice />
      <span className="hidden @md:inline">
        <FormattedMessage defaultMessage="Add Dice" />
      </span>
    </Button>
  );
};
