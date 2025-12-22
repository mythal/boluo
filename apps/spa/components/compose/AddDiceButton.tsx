import Dice from '@boluo/icons/Dice';
import { useSetAtom } from 'jotai';
import { type FC } from 'react';
import { useIntl } from 'react-intl';
import { useComposeAtom } from '../../hooks/useComposeAtom';
import { InComposeButton } from './InComposeButton';
import { useDefaultRollCommand } from '../../hooks/useDefaultRollCommand';
import { useTooltip } from '@boluo/ui/hooks/useTooltip';
import { TooltipBox } from '@boluo/ui/TooltipBox';

export const AddDiceButton: FC = () => {
  const { showTooltip, refs, getFloatingProps, getReferenceProps, floatingStyles } =
    useTooltip('top-end');
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
  const title = intl.formatMessage({ defaultMessage: 'Add a dice roll' });
  return (
    <div
      className="AddDiceButton shrink-0 self-end py-1"
      ref={refs.setReference}
      {...getReferenceProps()}
    >
      <InComposeButton onClick={handleAddDice} label={title}>
        <Dice />
      </InComposeButton>
      <TooltipBox
        show={showTooltip}
        style={floatingStyles}
        ref={refs.setFloating}
        {...getFloatingProps()}
        defaultStyle
      >
        {title}
      </TooltipBox>
    </div>
  );
};
