import React from 'react';
import { Loading } from '../Loading';
import { SendIcon } from '../icons';
import { KeyTooltip } from './KeyTooltip';

interface Props {
  canSend: boolean;
  send: () => void;
  sending: boolean;
}

export const SendButton: React.FC<Props> = ({ canSend, send, sending }) => {
  return (
    <KeyTooltip help="发送" keyHelp="Ctrl / ⌘ + ↵">
      <button className="btn-large btn-primary" disabled={!canSend} onClick={send}>
        {sending ? <Loading className="w-4 h-4" /> : <SendIcon />}
        <span className="ml-2">发送</span>
      </button>
    </KeyTooltip>
  );
};
