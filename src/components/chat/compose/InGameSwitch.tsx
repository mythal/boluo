import * as React from 'react';
import { ComposeDispatch, update } from './reducer';
import mask from '../../../assets/icons/theater-masks.svg';
import ChatItemToolbarButton from '../ChatItemToolbarButton';

interface Props {
  inGame: boolean;
  composeDispatch: ComposeDispatch;
  className?: string;
  size?: 'normal' | 'large';
}

function InGameSwitch({ inGame, composeDispatch, className, size }: Props) {
  const toggleInGame = () => composeDispatch(update({ inGame: !inGame }));
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
