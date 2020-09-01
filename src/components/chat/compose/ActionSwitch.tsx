import * as React from 'react';
import running from '../../../assets/icons/running.svg';
import ChatItemToolbarButton from '../ChatItemToolbarButton';
import { ComposeDispatch, update } from './reducer';

interface Props {
  isAction: boolean;
  size?: 'normal' | 'large';
  className?: string;
  composeDispatch: ComposeDispatch;
}

function ActionSwitch({ isAction, className, composeDispatch, size }: Props) {
  const toggleAction = () => composeDispatch(update({ isAction: !isAction }));
  return (
    <ChatItemToolbarButton
      on={isAction}
      className={className}
      onClick={toggleAction}
      sprite={running}
      title="描述动作"
      size={size}
    />
  );
}

export default React.memo(ActionSwitch);
