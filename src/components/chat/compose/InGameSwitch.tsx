import * as React from 'react';
import mask from '../../../assets/icons/theater-masks.svg';
import ChatItemToolbarButton from '../ChatItemToolbarButton';
import { useAtom } from 'jotai';
import { inGameAtom } from './state';
import { useCallback } from 'react';

interface Props {
  className?: string;
  size?: 'normal' | 'large';
}

function InGameSwitch({ className, size }: Props) {
  const [inGame, setInGame] = useAtom(inGameAtom);
  const toggleInGame = useCallback(() => setInGame((inGame) => !inGame), [setInGame]);
  return (
    <ChatItemToolbarButton
      on={inGame}
      className={className}
      onClick={toggleInGame}
      sprite={mask}
      title="游戏内"
      size={size}
      info="Esc"
    />
  );
}

export default React.memo(InGameSwitch);
