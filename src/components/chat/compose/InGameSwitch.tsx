import * as React from 'react';
import { ComposeDispatch, update } from './reducer';
import mask from '../../../assets/icons/theater-masks.svg';
import { isMac } from '../../../utils/browser';
import ChatItemToolbarButton from '../ChatItemToolbarButton';

interface Props {
  inGame: boolean;
  composeDispatch: ComposeDispatch;
  className?: string;
}

function InGameSwitch({ inGame, composeDispatch, className }: Props) {
  const toggleInGame = () => composeDispatch(update({ inGame: !inGame }));
  return (
    <ChatItemToolbarButton
      on={inGame}
      className={className}
      onClick={toggleInGame}
      sprite={mask}
      title="游戏内"
      info={isMac ? 'Option' : 'Alt'}
    />
  );
}

export default React.memo(InGameSwitch);
