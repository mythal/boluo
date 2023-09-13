import clsx from 'clsx';
import { Mask } from 'icons';
import { atom, useAtomValue, useSetAtom } from 'jotai';
import { selectAtom } from 'jotai/utils';
import { FC, useMemo } from 'react';
import { FormattedMessage } from 'react-intl';
import { Button } from 'ui/Button';
import { useChannelAtoms } from '../../hooks/useChannelAtoms';
import { Delay } from '../Delay';
import { FallbackIcon } from '../FallbackIcon';

interface Props {
  type?: 'DEFAULT' | 'ICON' | 'SMALL';
}

export const InGameSwitchButton: FC<Props> = ({ type = 'DEFAULT' }) => {
  const iconOnly = type === 'ICON';
  const { inGameAtom, composeAtom } = useChannelAtoms();
  const inGame = useAtomValue(inGameAtom);
  const dispatch = useSetAtom(composeAtom);
  return (
    <Button
      data-type="switch"
      data-on={inGame}
      data-small={type === 'SMALL' || iconOnly}
      onClick={() => dispatch({ type: 'toggleInGame', payload: {} })}
    >
      <Delay fallback={<FallbackIcon />}>
        <Mask />
      </Delay>
      <span className={clsx('hidden', !iconOnly && '@md:inline')}>
        <FormattedMessage defaultMessage="In Game" />
      </span>
    </Button>
  );
};
