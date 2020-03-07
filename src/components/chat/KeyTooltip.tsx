import React from 'react';
import { Tooltip } from '../Tooltip';

interface KeyTooltipProps {
  help: string;
  keyHelp: string;
}

export const KeyTooltip: React.FC<KeyTooltipProps> = React.memo<KeyTooltipProps>(({ help, keyHelp, children }) => (
  <Tooltip
    message={
      <div className="text-right px-2" style={{ width: 'max-content' }}>
        <div className="text-sm">{help}</div>
        <div className="text-xs">{keyHelp}</div>
      </div>
    }
  >
    {children}
  </Tooltip>
));
