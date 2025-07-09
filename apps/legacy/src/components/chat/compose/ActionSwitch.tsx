import * as React from 'react';
import { useCallback } from 'react';
import Running from '../../../assets/icons/running.svg';
import { useChannelId } from '../../../hooks/useChannelId';
import { useDispatch, useSelector } from '../../../store';
import ChatItemToolbarButton from '../ChatItemToolbarButton';

interface Props {
  size?: 'normal' | 'large';
  className?: string;
}

function ActionSwitch({ className, size }: Props) {
  const pane = useChannelId();
  const dispatch = useDispatch();
  const isAction = useSelector((state) => state.chatStates.get(pane)!.compose.isAction);
  const toggle = useCallback(
    () => dispatch({ type: 'SET_IS_ACTION', pane, isAction: 'TOGGLE' }),
    [dispatch, pane],
  );
  return (
    <ChatItemToolbarButton
      on={isAction}
      className={className}
      onClick={toggle}
      icon={Running}
      title="描述动作"
      size={size}
    />
  );
}

export default React.memo(ActionSwitch);
