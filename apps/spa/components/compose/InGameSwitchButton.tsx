import { Mask } from '@boluo/icons';
import { useAtomValue, useSetAtom } from 'jotai';
import { FC } from 'react';
import { useIntl } from 'react-intl';
import { useChannelAtoms } from '../../hooks/useChannelAtoms';
import { InComposeButton } from './InComposeButton';
import { useDefaultInGame } from '../../hooks/useDefaultInGame';
import { useTooltip } from '../../hooks/useTooltip';
import { TooltipBox } from '../common/TooltipBox';

interface Props {}

export const InGameSwitchButton: FC<Props> = () => {
  const defaultInGame = useDefaultInGame();
  const { inGameAtom, composeAtom } = useChannelAtoms();

  const { showTooltip, refs, getFloatingProps, getReferenceProps, floatingStyles } = useTooltip('top-start');
  const intl = useIntl();
  const inGame = useAtomValue(inGameAtom);
  const dispatch = useSetAtom(composeAtom);
  const title = intl.formatMessage({ defaultMessage: 'Toggle In Game' });
  return (
    <div className="flex-shrink-0 py-1" ref={refs.setReference} {...getReferenceProps()}>
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
        title={title}
      >
        <Mask className={inGame ? '' : 'text-text-lighter'} />
      </InComposeButton>
      <TooltipBox show={showTooltip} style={floatingStyles} ref={refs.setFloating} {...getFloatingProps()} defaultStyle>
        {title}
      </TooltipBox>
    </div>
  );
};
