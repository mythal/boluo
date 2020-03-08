import React from 'react';
import { cls } from '../../classname';
import { BroadcastIcon } from '../icons';
import { KeyTooltip } from './KeyTooltip';

interface Props {
  toggle: () => void;
  isBroadcast: boolean;
}

export const BroadcastButton = React.memo<Props>(({ toggle, isBroadcast }) => {
  return (
    <KeyTooltip help="发送实时预览" keyHelp="Ctrl + Q">
      <button onClick={toggle} className={cls('btn', { 'btn-down': isBroadcast })}>
        <BroadcastIcon />
      </button>
    </KeyTooltip>
  );
});
