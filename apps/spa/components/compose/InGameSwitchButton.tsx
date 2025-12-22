import Mask from '@boluo/icons/Mask';
import { useAtomValue, useSetAtom } from 'jotai';
import { type FC } from 'react';
import { useIntl } from 'react-intl';
import { useChannelAtoms } from '../../hooks/useChannelAtoms';
import { InComposeButton } from './InComposeButton';
import { useDefaultInGame } from '../../hooks/useDefaultInGame';
import { useTooltip } from '@boluo/ui/hooks/useTooltip';
import { TooltipBox } from '@boluo/ui/TooltipBox';
import { Kbd } from '@boluo/ui/Kbd';

export const InGameSwitchButton: FC = () => {
  const defaultInGame = useDefaultInGame();
  const { inGameAtom, composeAtom } = useChannelAtoms();

  const { showTooltip, refs, getFloatingProps, getReferenceProps, floatingStyles } =
    useTooltip('top-start');
  const intl = useIntl();
  const inGame = useAtomValue(inGameAtom);
  const dispatch = useSetAtom(composeAtom);
  const title = intl.formatMessage({ defaultMessage: 'Toggle In Game' });
  const tooltipLabel = intl.formatMessage({ defaultMessage: 'Toggle In Game' });
  return (
    <div className="shrink-0 py-1" ref={refs.setReference} {...getReferenceProps()}>
      <InComposeButton
        pressed={inGame}
        onClick={() =>
          dispatch({
            type: 'toggleInGame',
            payload: {
              defaultInGame,
            },
          })
        }
        label={title}
      >
        <Mask className={inGame ? '' : 'text-text-muted'} />
      </InComposeButton>
      <TooltipBox
        show={showTooltip}
        style={floatingStyles}
        ref={refs.setFloating}
        {...getFloatingProps()}
        defaultStyle
      >
        {tooltipLabel}
        <div className="py-2 text-right text-sm">
          <Kbd>Esc</Kbd>
        </div>
      </TooltipBox>
    </div>
  );
};
