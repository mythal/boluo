import React from 'react';
import { InformationLevel } from '../actions/information';
import { CancelIcon, InfoIcon, SuccessIcon, WarningIcon } from './icons';
import { cls } from '../utils';

interface Props {
  level: InformationLevel;
  content: React.ReactChild;
  className?: string;
  dismiss?: () => void;
}

export const InformationItem = React.memo<Props>(({ level, content, className, dismiss }) => {
  let color;
  let Icon;
  switch (level) {
    case 'INFO':
      color = 'bg-gray-200 border-gray-500';
      Icon = InfoIcon;
      break;
    case 'ERROR':
      color = 'bg-red-200 border-red-300';
      Icon = WarningIcon;
      break;
    case 'SUCCESS':
      color = 'bg-green-200 border-green-400';
      Icon = SuccessIcon;
      break;
  }
  return (
    <div>
      <div className={cls('my-1 p-2 text-xs border border-l-8 flex items-center shadow-hard', color, className)}>
        <div className="w-6 text-center ml-1   mr-2">
          <Icon size="lg" />
        </div>
        <div className="flex-grow">{content}</div>
        {dismiss ? (
          <button className="btn-large py-1 px-2 ml-1" onClick={dismiss}>
            <CancelIcon />
          </button>
        ) : null}
      </div>
    </div>
  );
});
