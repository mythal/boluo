import * as React from 'react';
import running from '../../../assets/icons/running.svg';
import ChatItemToolbarButton from '../../atoms/ChatItemToolbarButton';
import { ComposeDispatch, update } from './reducer';

interface Props {
  isAction: boolean;
  className?: string;
  composeDispatch: ComposeDispatch;
}

function ActionSwitch({ isAction, className, composeDispatch }: Props) {
  const toggleAction = () => composeDispatch(update({ isAction: !isAction }));
  return (
    <ChatItemToolbarButton
      on={isAction}
      className={className}
      onClick={toggleAction}
      sprite={running}
      title="描述动作"
    />
  );
}

export default React.memo(ActionSwitch);
