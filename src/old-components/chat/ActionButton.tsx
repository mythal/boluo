import React from 'react';
import { ActionIcon } from '../icons';
import { KeyTooltip } from './KeyTooltip';
import { cls } from '../../utils';

interface Props {
  toggle: () => void;
  isAction: boolean;
}

export const ActionButton = React.memo<Props>(({ toggle, isAction }) => {
  return (
    <KeyTooltip help="表示动作" keyHelp="Ctrl + M">
      <button onClick={toggle} className={cls('btn', { 'btn-down': isAction })}>
        <ActionIcon />
      </button>
    </KeyTooltip>
  );
});
