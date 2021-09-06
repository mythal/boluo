import * as React from 'react';
import running from '../../../assets/icons/running.svg';
import ChatItemToolbarButton from '../ChatItemToolbarButton';
import { useAtom } from 'jotai';
import { isActionAtom } from './state';
import { useCallback } from 'react';

interface Props {
  size?: 'normal' | 'large';
  className?: string;
}

function ActionSwitch({ className, size }: Props) {
  const [isAction, setIsAction] = useAtom(isActionAtom);
  const toggle = useCallback(() => setIsAction((isAction) => !isAction), [setIsAction]);
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
