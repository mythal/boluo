import * as React from 'react';
import running from '../../../assets/icons/running.svg';
import ChatItemToolbarButton from '../ChatItemToolbarButton';
import { useAtom } from 'jotai';
import { isActionAtom } from './state';
import { useCallback } from 'react';
import { useChannelId } from '../../../hooks/useChannelId';

interface Props {
  size?: 'normal' | 'large';
  className?: string;
}

function ActionSwitch({ className, size }: Props) {
  const [isAction, setIsAction] = useAtom(isActionAtom, useChannelId());
  const toggle = useCallback(() => setIsAction('toggle'), [setIsAction]);
  return (
    <ChatItemToolbarButton
      on={isAction}
      className={className}
      onClick={toggle}
      sprite={running}
      title="描述动作"
      size={size}
    />
  );
}

export default React.memo(ActionSwitch);
