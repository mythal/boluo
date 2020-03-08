import React from 'react';
import { KeyTooltip } from './KeyTooltip';
import { cls } from '../../classname';
import { CharacterIcon } from '../icons';

interface Props {
  toggle: () => void;
  inGame: boolean;
}

export const InGameButton = React.memo<Props>(({ toggle, inGame }) => {
  return (
    <KeyTooltip help="游戏内消息" keyHelp="Tab">
      <button onClick={toggle} className={cls('btn', { 'btn-down': inGame })}>
        <CharacterIcon />
      </button>
    </KeyTooltip>
  );
});
